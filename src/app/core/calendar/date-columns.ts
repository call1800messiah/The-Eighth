import type { InGameDate, Precision } from '@the-eighth/fantasy-calendar';

const PRECISIONS: string[] = ['day', 'month', 'year'];

/** Builds a date from its two stored columns; null unless both are set and valid. */
export function readDate(day: number | null | undefined, precision: string | null | undefined): InGameDate | null {
  if (day === null || day === undefined || !precision || !PRECISIONS.includes(precision)) {
    return null;
  }
  return { day, precision: precision as Precision };
}

/** The two columns to write for a date, e.g. `birth_day` and `birth_precision`. */
export function dateColumns(prefix: 'date' | 'birth' | 'death', date: InGameDate | null): Record<string, number | string | null> {
  return {
    [`${prefix}_day`]: date ? date.day : null,
    [`${prefix}_precision`]: date ? date.precision : null,
  };
}
