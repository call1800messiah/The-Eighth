import { CalendarDefinition, DateParts, ResolvedDate } from './types.js';
import { fromAstronomical, toAstronomical } from './era.js';

interface Cycle {
  length: number; // years per leap cycle
  days: number; // days per leap cycle
}

const cycles = new WeakMap<CalendarDefinition, Cycle>();

function floorMod(a: number, b: number): number {
  return a - Math.floor(a / b) * b;
}

function gcd(a: number, b: number): number {
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}

export function validateCalendar(def: CalendarDefinition): string[] {
  const errors: string[] = [];
  if (!def.months || def.months.length === 0) {
    errors.push('A calendar needs at least one month.');
  } else {
    def.months.forEach((m, i) => {
      if (!Number.isInteger(m.days) || m.days < 1) {
        errors.push(`Month ${i} (${m.name}) needs at least one day.`);
      }
      if (m.leapDays !== undefined && (!Number.isInteger(m.leapDays) || m.leapDays < 0)) {
        errors.push(`Month ${i} (${m.name}) has an invalid leapDays.`);
      }
    });
  }
  if (!def.week || !def.week.days || def.week.days.length === 0) {
    errors.push('The week needs at least one day.');
  } else if (
    !Number.isInteger(def.week.epochWeekday) ||
    def.week.epochWeekday < 0 ||
    def.week.epochWeekday >= def.week.days.length
  ) {
    errors.push('epochWeekday must be an index into the week days.');
  }
  if (!Number.isInteger(def.epochDay)) {
    errors.push('epochDay must be an integer.');
  }
  (def.leap?.rules ?? []).forEach((r, i) => {
    if (!Number.isInteger(r.every) || r.every < 1) {
      errors.push(`Leap rule ${i} needs an integer "every" of at least 1.`);
    }
    if (r.offset !== undefined && !Number.isInteger(r.offset)) {
      errors.push(`Leap rule ${i} needs an integer offset.`);
    }
  });
  return errors;
}

function isLeapAstro(def: CalendarDefinition, astro: number): boolean {
  let leap = false;
  for (const r of def.leap?.rules ?? []) {
    if (floorMod(astro - (r.offset ?? 0), r.every) === 0) {
      leap = r.leap;
    }
  }
  return leap;
}

function monthDays(def: CalendarDefinition, leap: boolean, month: number): number {
  const m = def.months[month];
  return m.days + (leap ? (m.leapDays ?? 0) : 0);
}

function yearDaysAstro(def: CalendarDefinition, astro: number): number {
  const leap = isLeapAstro(def, astro);
  let total = 0;
  for (let i = 0; i < def.months.length; i++) {
    total += monthDays(def, leap, i);
  }
  return total;
}

function cycleOf(def: CalendarDefinition): Cycle {
  let c = cycles.get(def);
  if (!c) {
    let length = 1;
    for (const r of def.leap?.rules ?? []) {
      length = (length / gcd(length, r.every)) * r.every;
    }
    let days = 0;
    for (let i = 0; i < length; i++) {
      days += yearDaysAstro(def, 1 + i);
    }
    c = { length, days };
    cycles.set(def, c);
  }
  return c;
}

export function isLeapYear(def: CalendarDefinition, year: number): boolean {
  return isLeapAstro(def, toAstronomical(def, year));
}

export function daysInYear(def: CalendarDefinition, year: number): number {
  return yearDaysAstro(def, toAstronomical(def, year));
}

export function daysInMonth(def: CalendarDefinition, year: number, month: number): number {
  return monthDays(def, isLeapYear(def, year), month);
}

export function isValidDate(def: CalendarDefinition, parts: DateParts): boolean {
  const { year, month, day } = parts;
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (!def.era.hasYearZero && year === 0) return false;
  if (month < 0 || month >= def.months.length) return false;
  return day >= 1 && day <= daysInMonth(def, year, month);
}

/** Days from the start of astronomical year 1 to the start of the given astronomical year. */
function yearStart(def: CalendarDefinition, astro: number): number {
  const cycle = cycleOf(def);
  const q = Math.floor((astro - 1) / cycle.length);
  const r = astro - 1 - q * cycle.length;
  let days = q * cycle.days;
  for (let i = 0; i < r; i++) {
    days += yearDaysAstro(def, 1 + i);
  }
  return days;
}

export function toDay(def: CalendarDefinition, parts: { year: number; month?: number; day?: number }): number {
  const full = { year: parts.year, month: parts.month ?? 0, day: parts.day ?? 1 };
  if (!isValidDate(def, full)) {
    throw new RangeError(`Invalid date ${full.year}-${full.month}-${full.day} in calendar ${def.id}`);
  }
  const leap = isLeapYear(def, full.year);
  let days = yearStart(def, toAstronomical(def, full.year));
  for (let i = 0; i < full.month; i++) {
    days += monthDays(def, leap, i);
  }
  return def.epochDay + days + full.day - 1;
}

export function fromDay(def: CalendarDefinition, n: number): ResolvedDate {
  if (!Number.isSafeInteger(n)) {
    throw new RangeError(`Invalid day number ${n}`);
  }
  const m = n - def.epochDay;
  const cycle = cycleOf(def);
  const q = Math.floor(m / cycle.days);
  let rem = m - q * cycle.days;
  let astro = 1 + q * cycle.length;
  // At most one cycle of years.
  for (;;) {
    const len = yearDaysAstro(def, astro);
    if (rem < len) break;
    rem -= len;
    astro++;
  }
  const leap = isLeapAstro(def, astro);
  let month = 0;
  for (;;) {
    const len = monthDays(def, leap, month);
    if (rem < len) break;
    rem -= len;
    month++;
  }
  return {
    year: fromAstronomical(def, astro),
    month,
    day: rem + 1,
    weekday: floorMod(m + def.week.epochWeekday, def.week.days.length),
  };
}
