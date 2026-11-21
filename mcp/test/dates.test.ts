import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatDateColumns, parseDateInput } from '../src/calendar/dates.js';
import { ToolError } from '../src/tools/entities.js';

describe('parseDateInput', () => {
  it('reads a full date', () => {
    const r = parseDateInput('3. Praios 1010 BF', 'birth')!;
    assert.equal(r['birth_precision'], 'day');
    assert.equal(formatDateColumns({ birth_day: r['birth_day'], birth_precision: 'day' }).birth, '3. Praios 1010 BF');
  });
  it('reads month and year precision', () => {
    assert.equal(parseDateInput('Phex 1027', 'death')!['death_precision'], 'month');
    assert.equal(parseDateInput('1010 BF', 'birth')!['birth_precision'], 'year');
  });
  it('clears with null or empty', () => {
    assert.deepEqual(parseDateInput(null, 'death'), { death_day: null, death_precision: null });
    assert.deepEqual(parseDateInput('', 'birth'), { birth_day: null, birth_precision: null });
  });
  it('returns undefined when not given', () => {
    assert.equal(parseDateInput(undefined, 'birth'), undefined);
  });
  it('throws a ToolError that shows the format', () => {
    for (const bad of ['Frühling 1030', '31. Praios 1030']) {
      assert.throws(() => parseDateInput(bad, 'birth'), (e: unknown) =>
        e instanceof ToolError && e.message.includes('"3. Praios 1010 BF"') && e.message.startsWith(`birth: "${bad}" is not a date.`));
    }
  });
});

describe('formatDateColumns', () => {
  it('adds formatted dates, also in embedded rows', () => {
    const out: any = formatDateColumns({
      date_day: 0, date_precision: 'day',
      people: [{ birth_day: 378103, birth_precision: 'year' }, { birth_day: null, birth_precision: null }],
    });
    assert.equal(out.date, '1. Praios 1 BF');
    assert.equal(out.people[0].birth, '1036 BF');
    assert.equal('birth' in out.people[1], false);
  });
  it('formats the pinned day', () => {
    const out: any = formatDateColumns({ death_day: 378103, death_precision: 'day' });
    assert.equal(out.death, '29. Ingerimm 1036 BF');
  });
});
