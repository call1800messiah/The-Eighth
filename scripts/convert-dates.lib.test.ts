import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import { convertBirth, convertDate } from './convert-dates.lib.ts';

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
