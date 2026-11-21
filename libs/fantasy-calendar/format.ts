import { CalendarDefinition, InGameDate, Precision } from './types.js';
import { fromDay, isValidDate, toDay } from './core.js';

export type FormatStyle = 'long' | 'short';

/** Builds a date; for coarser precision the day is the first day of the month or year. */
export function dateOf(
  def: CalendarDefinition,
  parts: { year: number; month?: number; day?: number },
  precision: Precision,
): InGameDate {
  const month = precision === 'year' ? 0 : (parts.month ?? 0);
  const day = precision === 'day' ? (parts.day ?? 1) : 1;
  return { day: toDay(def, { year: parts.year, month, day }), precision };
}

export function format(def: CalendarDefinition, date: InGameDate, style: FormatStyle = 'long'): string {
  const r = fromDay(def, date.day);
  const m = def.months[r.month];
  const isShort = style === 'short';
  const era = def.era;
  const before = r.year < (era.hasYearZero ? 0 : 1);
  const signed = before && (isShort || era.beforeSuffix === undefined);
  let year = String(signed ? r.year : Math.abs(r.year));
  if (!isShort) {
    if (before && era.beforeSuffix !== undefined) year += ` ${era.beforeSuffix}`;
    else if (era.suffix) year += ` ${era.suffix}`;
  }
  const month = isShort ? (m.shortName ?? m.name.slice(0, 3)) : m.name;
  switch (date.precision) {
    case 'day':
      return `${r.day}. ${month} ${year}`;
    case 'month':
      return `${month} ${year}`;
    default:
      return year;
  }
}

/** Matches a trailing era suffix, case-insensitively, with flexible spacing ("v. BF" = "v.BF"). */
function suffixPattern(suffix: string | undefined): RegExp | null {
  const s = suffix?.trim();
  if (!s) return null;
  const body = s
    .split(/\s+/)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('\\s*');
  return new RegExp(`^(.*?)\\s*${body}$`, 'i');
}

function findMonth(def: CalendarDefinition, text: string): number {
  const t = text.toLowerCase();
  return def.months.findIndex((m) =>
    [m.name, m.shortName, ...(m.aliases ?? [])].some((x) => x !== undefined && x.toLowerCase() === t),
  );
}

/** Reads a date the way it is usually written; null for anything it cannot read. Never throws. */
export function parse(def: CalendarDefinition, text: string): InGameDate | null {
  try {
    let s = String(text).trim().replace(/\s+/g, ' ');
    let negative = false;
    const mb = suffixPattern(def.era.beforeSuffix)?.exec(s);
    if (mb) {
      s = mb[1];
      negative = true;
    } else {
      const ma = suffixPattern(def.era.suffix)?.exec(s);
      if (ma) s = ma[1];
    }
    if (!s) return null;

    let monthText: string | null = null;
    let dayText: string | null = null;
    let yearText: string;
    let m: RegExpExecArray | null;
    if ((m = /^(\d{1,6})\.\s*(\D.*?)\s+(-?\d{1,12})$/.exec(s))) {
      [, dayText, monthText, yearText] = m;
    } else if ((m = /^(\D.*?)\s+(-?\d{1,12})$/.exec(s))) {
      [, monthText, yearText] = m;
    } else if ((m = /^(-?\d{1,12})$/.exec(s))) {
      yearText = m[1];
    } else {
      return null;
    }

    let year = Number(yearText);
    if (negative) year = -Math.abs(year);
    year = year || 0; // no negative zero

    let month = 0;
    if (monthText !== null) {
      month = findMonth(def, monthText);
      if (month < 0) return null;
    }
    const day = dayText === null ? 1 : Number(dayText);
    if (!isValidDate(def, { year, month, day })) return null;
    const n = toDay(def, { year, month, day });
    if (!Number.isSafeInteger(n)) return null;
    return { day: n, precision: dayText !== null ? 'day' : monthText !== null ? 'month' : 'year' };
  } catch {
    return null;
  }
}
