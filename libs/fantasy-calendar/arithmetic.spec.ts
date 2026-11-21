import { fromDay, toDay } from './core';
import { addDays, addMonths, addYears, daysBetween, yearOf } from './arithmetic';
import { aventurian as av } from './testing/aventurian';
import { gregorian } from './testing/gregorian';

describe('fantasy-calendar arithmetic', () => {
  it('addDays and daysBetween', () => {
    expect(addDays(10, -20)).toBe(-10);
    expect(daysBetween(5, 2)).toBe(-3);
  });

  it('yearOf', () => {
    expect(yearOf(av, -1)).toBe(0);
    expect(yearOf(av, 0)).toBe(1);
  });

  it('addMonths clamps the day', () => {
    const n = toDay(av, { year: 1030, month: 11, day: 30 });
    expect(fromDay(av, addMonths(av, n, 1))).toEqual(jasmine.objectContaining({ year: 1030, month: 12, day: 5 }));
    expect(fromDay(av, addMonths(av, n, 2))).toEqual(jasmine.objectContaining({ year: 1031, month: 0, day: 30 }));
    expect(fromDay(av, addMonths(av, n, -13))).toEqual(jasmine.objectContaining({ year: 1029, month: 11, day: 30 }));
  });

  it('addMonths crosses the era boundary', () => {
    const n = toDay(av, { year: 0, month: 12, day: 3 });
    expect(fromDay(av, addMonths(av, n, 1))).toEqual(jasmine.objectContaining({ year: 1, month: 0, day: 3 }));
    const g = toDay(gregorian, { year: -1, month: 11, day: 31 });
    expect(fromDay(gregorian, addMonths(gregorian, g, 1))).toEqual(
      jasmine.objectContaining({ year: 1, month: 0, day: 31 }),
    );
  });

  it('addYears stays valid and clamps', () => {
    const n = toDay(av, { year: 1030, month: 12, day: 5 });
    expect(fromDay(av, addYears(av, n, 3))).toEqual(jasmine.objectContaining({ year: 1033, month: 12, day: 5 }));
    const leap = toDay(gregorian, { year: 2024, month: 1, day: 29 });
    expect(fromDay(gregorian, addYears(gregorian, leap, 1))).toEqual(
      jasmine.objectContaining({ year: 2025, month: 1, day: 28 }),
    );
    const first = toDay(gregorian, { year: 1, month: 0, day: 1 });
    expect(fromDay(gregorian, addYears(gregorian, first, -1))).toEqual(
      jasmine.objectContaining({ year: -1, month: 0, day: 1 }),
    );
  });
});
