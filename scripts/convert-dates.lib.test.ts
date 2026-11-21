import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import { convertAll, convertBirth, convertDate, fetchAll } from './convert-dates.lib.ts';
import type { ConversionStore } from './convert-dates.lib.ts';

const def = JSON.parse(fs.readFileSync('src/assets/the-eighth/rules.json', 'utf8')).calendars.list[0];

test('convertDate: full date gives day precision', () => {
  assert.deepEqual(convertDate(def, '29. Ingerimm 1036'), { day: 378103, precision: 'day' });
});

test('convertDate: month and year gives month precision', () => {
  assert.equal(convertDate(def, 'Phex 1027')?.precision, 'month');
});

test('convertDate: unparseable, missing or yearless text gives null', () => {
  assert.equal(convertDate(def, 'Bald'), null);
  assert.equal(convertDate(def, null), null);
  assert.equal(convertDate(def, '9. Praios'), null);
});

test('convertBirth: day and year give day precision', () => {
  const c = convertBirth(def, '9. Rondra', 1011);
  assert.equal(c?.precision, 'day');
  assert.deepEqual(c, convertDate(def, '9. Rondra 1011'));
});

test('convertBirth: year only gives year precision', () => {
  assert.equal(convertBirth(def, null, -5000000)?.precision, 'year');
});

test('convertBirth: birthday without year or nothing gives null', () => {
  assert.equal(convertBirth(def, '9. Rondra', null), null);
  assert.equal(convertBirth(def, null, null), null);
});

test('fetchAll pages until a short page', async () => {
  const data = Array.from({ length: 5 }, (_, i) => ({ id: i }));
  const asked: [number, number][] = [];
  const all = await fetchAll(async (from, to) => {
    asked.push([from, to]);
    return { data: data.slice(from, to + 1), error: null };
  }, 2);
  assert.deepEqual(all, data);
  assert.deepEqual(asked, [[0, 1], [2, 3], [4, 5]]);
});

test('fetchAll stops after an empty page when the rows fill the last page exactly', async () => {
  const data = [{ id: 1 }, { id: 2 }];
  let calls = 0;
  const all = await fetchAll(async (from, to) => {
    calls++;
    return { data: data.slice(from, to + 1), error: null };
  }, 2);
  assert.deepEqual(all, data);
  assert.equal(calls, 2);
});

test('fetchAll throws on a read error', async () => {
  await assert.rejects(fetchAll(async () => ({ data: null, error: { message: 'boom' } }), 2), /boom/);
});

/** An in-memory store: rows per table, writes recorded, ids in failOn refuse the write. */
function fakeStore(tables: Record<string, any[]>, failOn: string[] = []) {
  const writes: { table: string; id: string; patch: Record<string, unknown> }[] = [];
  const asked: Record<string, string[]> = {};
  const store: ConversionStore = {
    async rows(table, _columns, legacy) {
      asked[table] = legacy;
      return tables[table] ?? [];
    },
    async update(table, id, patch) {
      if (failOn.includes(id)) return 'value is out of range';
      writes.push({ table, id, patch });
      return null;
    },
  };
  return { store, writes, asked };
}

const tables = () => ({
  campaign: [{ id: 'c1', date_legacy: '29. Ingerimm 1036' }],
  historic_events: [
    { id: 'h1', date_legacy: '9. Praios' },
    { id: 'h2', date_legacy: 'Phex 1027' },
  ],
  people: [
    { id: 'p1', birthday_legacy: null, birthyear_legacy: 1011, deathday_legacy: 'Bald' },
    { id: 'p2', birthday_legacy: '9. Rondra', birthyear_legacy: 1011, deathday_legacy: '3. Praios 1040' },
  ],
});

test('convertAll asks only for rows that still have legacy text', async () => {
  const { store, asked } = fakeStore(tables());
  await convertAll(def, store, false);
  assert.deepEqual(asked, {
    campaign: ['date_legacy'],
    historic_events: ['date_legacy'],
    people: ['birthday_legacy', 'birthyear_legacy', 'deathday_legacy'],
  });
});

test('convertAll dry run writes nothing and lists what does not parse', async () => {
  const { store, writes } = fakeStore(tables());
  const out = await convertAll(def, store, false);
  assert.equal(writes.length, 0);
  assert.equal(out.converted.length, 5);
  assert.deepEqual(out.unparsed, ['historic_events h1: "9. Praios"', 'people p1 death: "Bald"']);
  assert.deepEqual(out.writeErrors, []);
});

test('convertAll keeps going after a failed write and reports it apart from unparsed rows', async () => {
  const { store, writes } = fakeStore(tables(), ['c1']);
  const out = await convertAll(def, store, true);
  assert.deepEqual(out.writeErrors, ['campaign c1: value is out of range']);
  assert.equal(out.converted.length, 4, 'the failed row does not count as converted');
  assert.equal(out.unparsed.length, 2);
  assert.deepEqual(writes.map((w) => `${w.table} ${w.id}`), [
    'historic_events h2',
    'people p1',
    'people p2',
    'people p2',
  ]);
  assert.deepEqual(writes[1].patch, {
    birth_day: convertBirth(def, null, 1011)!.day,
    birth_precision: 'year',
    birthday_legacy: null,
    birthyear_legacy: null,
  });
});
