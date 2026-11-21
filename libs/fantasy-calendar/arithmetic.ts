import { CalendarDefinition } from './types.js';
import { daysInMonth, fromDay, toDay } from './core.js';

/** Year numbering without a gap: the calendar year with year zero closed up. */
function toOrdinal(def: CalendarDefinition, year: number): number {
  return def.era.hasYearZero ? year : year < 0 ? year + 1 : year;
}

function fromOrdinal(def: CalendarDefinition, ordinal: number): number {
  return def.era.hasYearZero ? ordinal : ordinal <= 0 ? ordinal - 1 : ordinal;
}

export function yearOf(def: CalendarDefinition, n: number): number {
  return fromDay(def, n).year;
}

export function addDays(n: number, days: number): number {
  return n + days;
}

/** b - a. */
export function daysBetween(a: number, b: number): number {
  return b - a;
}

function resolve(def: CalendarDefinition, ordinal: number, month: number, day: number): number {
  const year = fromOrdinal(def, ordinal);
  return toDay(def, { year, month, day: Math.min(day, daysInMonth(def, year, month)) });
}

/** Moves by whole months; a day past the end of the target month is clamped to its last day. */
export function addMonths(def: CalendarDefinition, n: number, months: number): number {
  const r = fromDay(def, n);
  const count = def.months.length;
  const total = toOrdinal(def, r.year) * count + r.month + months;
  const ordinal = Math.floor(total / count);
  return resolve(def, ordinal, total - ordinal * count, r.day);
}

/** Moves by whole years; a day past the end of the target month is clamped to its last day. */
export function addYears(def: CalendarDefinition, n: number, years: number): number {
  const r = fromDay(def, n);
  return resolve(def, toOrdinal(def, r.year) + years, r.month, r.day);
}
