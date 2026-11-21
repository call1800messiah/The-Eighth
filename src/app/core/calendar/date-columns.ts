import type { InGameDate, Precision } from '@the-eighth/fantasy-calendar';

const PRECISIONS: string[] = ['day', 'month', 'year'];

/** Builds a date from its two stored columns; null unless both are set and valid. */
export function readDate(day: number | null | undefined, precision: string | null | undefined): InGameDate | null {
  if (typeof day !== 'number' || !Number.isSafeInteger(day) || !precision || !PRECISIONS.includes(precision)) {
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

type DatePrefix = 'date' | 'birth' | 'death';

/** The old free-text columns of each date, kept until converted or replaced. */
const LEGACY_COLUMNS: Record<DatePrefix, string[]> = {
  date: ['date_legacy'],
  birth: ['birthday_legacy', 'birthyear_legacy'],
  death: ['deathday_legacy'],
};

/**
 * Moves a date field onto its columns, in place: `fields[prefix]` becomes
 * `<prefix>_day` / `<prefix>_precision`, and `fields[<prefix>Legacy]` is
 * removed. The old text is never written; its columns are cleared when a date
 * is set, or when `<prefix>Legacy` is explicitly `null` (the user discarded
 * it). A missing date field leaves the date and its old text alone.
 */
export function storeDate(fields: Record<string, any>, prefix: DatePrefix): void {
  const legacyKey = `${prefix}Legacy`;
  const discard = legacyKey in fields && fields[legacyKey] === null;
  delete fields[legacyKey];
  const date = fields[prefix];
  if (date === undefined) {
    if (discard) {
      LEGACY_COLUMNS[prefix].forEach(column => fields[column] = null);
    }
    return;
  }
  delete fields[prefix];
  Object.assign(fields, dateColumns(prefix, date));
  if (date || discard) {
    LEGACY_COLUMNS[prefix].forEach(column => fields[column] = null);
  }
}
