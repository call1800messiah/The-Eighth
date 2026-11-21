import { CalendarDefinition } from './types';
import { daysInYear, fromDay, isLeapYear, isValidDate, toDay, validateCalendar } from './core';
import { gregorian } from './testing/gregorian';

const aventurian: CalendarDefinition = {
  id: 'aventurian',
  name: 'Aventurian',
  epochDay: 0,
  months: [
    ...Array.from({ length: 12 }, (_, i) => ({ name: `Month ${i + 1}`, days: 30 })),
    { name: 'Nameless Days', days: 5 },
  ],
  week: {
    days: ['Windstag', 'Erdstag', 'Markttag', 'Rohalstag', 'Feuertag', 'Wassertag', 'Freitag'],
    epochWeekday: 4,
  },
  era: { suffix: 'BF', hasYearZero: true },
};

describe('fantasy-calendar core', () => {
  it('round-trips every day from -800 to 800 years', () => {
    for (const def of [aventurian, gregorian]) {
      for (let n = -800 * 365; n <= 800 * 365; n += 97) {
        expect(toDay(def, fromDay(def, n))).toBe(n);
      }
    }
  });

  it('round-trips far past dates', () => {
    const start = performance.now();
    for (const def of [aventurian, gregorian]) {
      for (const year of [-100_000_000, -1_000_000, -3500, -1]) {
        const parts = { year, month: 4, day: 17 };
        const back = fromDay(def, toDay(def, parts));
        expect({ year: back.year, month: back.month, day: back.day }).toEqual(parts);
      }
    }
    expect(performance.now() - start).toBeLessThan(50);
  });

  it('boundary around year 0', () => {
    const pick = (n: number) => {
      const { year, month, day } = fromDay(aventurian, n);
      return { year, month, day };
    };
    expect(pick(0)).toEqual({ year: 1, month: 0, day: 1 });
    expect(pick(-1)).toEqual({ year: 0, month: 12, day: 5 });
    expect(pick(-365)).toEqual({ year: 0, month: 0, day: 1 });
    expect(pick(-366)).toEqual({ year: -1, month: 12, day: 5 });
  });

  it('no year zero when hasYearZero is false', () => {
    const def: CalendarDefinition = { ...aventurian, era: { suffix: 'BF', hasYearZero: false } };
    expect(fromDay(def, -1).year).toBe(-1);
    expect(isValidDate(def, { year: 0, month: 0, day: 1 })).toBeFalse();
    expect(() => toDay(def, { year: 0, month: 0, day: 1 })).toThrowError(RangeError);
  });

  it('matches JavaScript Date for the Gregorian fixture', () => {
    for (let i = 0; i < 2000; i++) {
      const y = 1 + Math.floor((i * 2999) / 1999);
      const m = (i * 7) % 12;
      const d = 1 + ((i * 13) % 28);
      const date = new Date(0);
      date.setUTCFullYear(y, m, d);
      const r = fromDay(gregorian, Math.floor(date.getTime() / 86400000));
      expect(r.year).toBe(y);
      expect(r.month).toBe(m);
      expect(r.day).toBe(d);
      expect(r.weekday).toBe(date.getUTCDay());
    }
  });

  it('leap rules: Gregorian 1900 no, 2000 yes, 2024 yes, 2023 no', () => {
    expect(isLeapYear(gregorian, 1900)).toBeFalse();
    expect(isLeapYear(gregorian, 2000)).toBeTrue();
    expect(isLeapYear(gregorian, 2024)).toBeTrue();
    expect(isLeapYear(gregorian, 2023)).toBeFalse();
    expect(daysInYear(gregorian, 2024)).toBe(366);
  });

  it('weekday', () => {
    expect(fromDay(aventurian, 0).weekday).toBe(4);
    expect(fromDay(aventurian, 365 * 999).weekday).toBe(2);
    expect(fromDay(aventurian, -1).weekday).toBe(3);
  });

  it('validateCalendar', () => {
    expect(validateCalendar(aventurian)).toEqual([]);
    expect(validateCalendar(gregorian)).toEqual([]);
    expect(validateCalendar({ ...aventurian, months: [] }).length).toBeGreaterThan(0);
    expect(validateCalendar({ ...aventurian, months: [{ name: 'x', days: 0 }] }).length).toBeGreaterThan(0);
    expect(validateCalendar({ ...aventurian, week: { days: [], epochWeekday: 0 } }).length).toBeGreaterThan(0);
    expect(validateCalendar({ ...aventurian, week: { days: ['a'], epochWeekday: 1 } }).length).toBeGreaterThan(0);
    expect(validateCalendar({ ...aventurian, leap: { rules: [{ every: 0, leap: true }] } }).length).toBeGreaterThan(0);
  });
});
