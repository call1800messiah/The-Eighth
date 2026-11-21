import { InGameDate } from './types';
import { fromDay, toDay } from './core';
import { dateOf, format, parse } from './format';
import { aventurian as av } from './testing/aventurian';

describe('fantasy-calendar format', () => {
  it('format long by precision', () => {
    expect(format(av, dateOf(av, { year: 1036, month: 10, day: 29 }, 'day'))).toBe('29. Ingerimm 1036 BF');
    expect(format(av, dateOf(av, { year: 1027, month: 8 }, 'month'))).toBe('Phex 1027 BF');
    expect(format(av, dateOf(av, { year: 1011 }, 'year'))).toBe('1011 BF');
    expect(format(av, dateOf(av, { year: -3500 }, 'year'))).toBe('3500 v. BF');
    expect(format(av, dateOf(av, { year: -100000000 }, 'year'))).toBe('100000000 v. BF');
    expect(format(av, dateOf(av, { year: 0 }, 'year'))).toBe('0 BF');
  });

  it('format without beforeSuffix prints the signed year', () => {
    const def = { ...av, era: { suffix: 'BF', hasYearZero: true } };
    expect(format(def, dateOf(def, { year: -5 }, 'year'))).toBe('-5 BF');
  });

  it('format short', () => {
    expect(format(av, dateOf(av, { year: 1036, month: 10, day: 29 }, 'day'), 'short')).toBe('29. Ing 1036');
    expect(format(av, dateOf(av, { year: 1027, month: 8 }, 'month'), 'short')).toBe('Phe 1027');
  });

  it('dateOf normalises coarser precision', () => {
    expect(dateOf(av, { year: 1027, month: 8, day: 17 }, 'month').day).toBe(
      toDay(av, { year: 1027, month: 8, day: 1 }),
    );
    expect(dateOf(av, { year: 1027, month: 8, day: 17 }, 'year').day).toBe(toDay(av, { year: 1027 }));
    expect(() => dateOf(av, { year: 1027, month: 8, day: 31 }, 'day')).toThrowError(RangeError);
  });

  it('parse accepts every form in the existing data', () => {
    const d = (year: number, month: number, day: number, p: 'day' | 'month' | 'year'): InGameDate =>
      dateOf(av, { year, month, day }, p);
    const table: [string, InGameDate][] = [
      ['29. Ingerimm 1036', d(1036, 10, 29, 'day')],
      ['27.  Travia 1031', d(1031, 3, 27, 'day')],
      ['26. Phex 1032 BF', d(1032, 8, 26, 'day')],
      ['3. Namenloser 1037 BF', d(1037, 12, 3, 'day')],
      ['Phex 1027', d(1027, 8, 1, 'month')],
      ['-1100', d(-1100, 0, 1, 'year')],
      ['1100 v. BF', d(-1100, 0, 1, 'year')],
      ['1100 v.BF', d(-1100, 0, 1, 'year')],
      ['1011', d(1011, 0, 1, 'year')],
      ['rahja 1030', d(1030, 11, 1, 'month')],
      ['  5.Rahja   1030  bf ', d(1030, 11, 5, 'day')],
    ];
    for (const [text, expected] of table) {
      expect(parse(av, text)).withContext(text).toEqual(expected);
    }
  });

  it('parse rejects', () => {
    for (const text of ['9. Praios', 'Bald', '?', '31. Praios 1030', 'Frühling 1030', '', '   ', '1e5', '12.5 1030']) {
      expect(parse(av, text)).withContext(text).toBeNull();
    }
    const noZero = { ...av, era: { suffix: 'BF', beforeSuffix: 'v. BF', hasYearZero: false } };
    expect(parse(noZero, '0')).toBeNull();
    expect(parse(noZero, '1')).not.toBeNull();
  });

  it('parse never throws on odd input', () => {
    for (const text of ['\u0000', '9'.repeat(400), '. . .', '-', 'v. BF', 'BF', '1. Praios 99999999999999999999']) {
      expect(() => parse(av, text)).not.toThrow();
    }
  });

  it('parse/format round-trip', () => {
    for (let i = 0; i < 300; i++) {
      const n = -400000 + i * 2711 + (i % 7) * 13;
      const r = fromDay(av, n);
      for (const p of ['day', 'month', 'year'] as const) {
        const date = dateOf(av, r, p);
        expect(parse(av, format(av, date))).withContext(`${n} ${p}`).toEqual(date);
      }
    }
  });
});
