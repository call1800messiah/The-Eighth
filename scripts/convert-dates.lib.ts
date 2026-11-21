import { dateOf, format, parse } from '../libs/fantasy-calendar/index.ts';
import type { CalendarDefinition, Precision } from '../libs/fantasy-calendar/index.ts';

export interface Converted {
  day: number;
  precision: Precision;
}

/** Legacy free text ("29. Ingerimm 1036") to a stored date, or null when it does not parse. */
export function convertDate(def: CalendarDefinition, legacy: string | null): Converted | null {
  if (legacy == null || legacy.trim() === '') return null;
  const d = parse(def, legacy);
  return d ? { day: d.day, precision: d.precision } : null;
}

/** Legacy birthday text plus birth year. A birthday without a year cannot be placed. */
export function convertBirth(
  def: CalendarDefinition,
  birthday: string | null,
  birthyear: number | null,
): Converted | null {
  if (birthyear == null) return null;
  if (birthday == null || birthday.trim() === '') {
    const d = dateOf(def, { year: birthyear }, 'year');
    return { day: d.day, precision: d.precision };
  }
  return convertDate(def, `${birthday} ${birthyear}`);
}

/** One page of rows, `from` to `to` inclusive (PostgREST `.range()`). */
export type PageFn = (
  from: number,
  to: number,
) => PromiseLike<{ data: any[] | null; error: { message: string } | null }>;

/** Rows per request; PostgREST caps a response at max_rows (1000 by default). */
export const PAGE_SIZE = 500;

/** Reads every page until a short one, so a large table is not cut off at max_rows. */
export async function fetchAll(page: PageFn, size = PAGE_SIZE): Promise<any[]> {
  const all: any[] = [];
  for (let from = 0; ; from += size) {
    const { data, error } = await page(from, from + size - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < size) return all;
  }
}

export interface ConversionStore {
  /** Every row of `table` with at least one of the `legacy` columns set, with `id` and `columns`. */
  rows(table: string, columns: string, legacy: string[]): Promise<any[]>;
  /** Writes the patch; returns the error message, or null on success. */
  update(table: string, id: string, patch: Record<string, unknown>): Promise<string | null>;
}

export interface ConversionOutcome {
  /** One line per converted (or, in a dry run, convertible) value. */
  converted: string[];
  /** Values that do not parse; left untouched. */
  unparsed: string[];
  /** Values that parse but could not be written; left untouched. */
  writeErrors: string[];
}

/**
 * Converts every legacy date. All rows are read before the first write, so
 * clearing legacy text cannot shift the pages still to be read.
 */
export async function convertAll(
  def: CalendarDefinition,
  store: ConversionStore,
  apply: boolean,
): Promise<ConversionOutcome> {
  const out: ConversionOutcome = { converted: [], unparsed: [], writeErrors: [] };

  async function save(table: string, label: string, id: string, legacy: string, c: Converted, patch: Record<string, unknown>) {
    if (apply) {
      const error = await store.update(table, id, patch);
      if (error) {
        out.writeErrors.push(`${label} ${id}: ${error}`);
        return;
      }
    }
    out.converted.push(`${label} ${id}: "${legacy}" → ${format(def, c)}`);
  }

  const simple: Record<string, any[]> = {};
  for (const table of ['campaign', 'historic_events']) {
    simple[table] = await store.rows(table, 'date_legacy', ['date_legacy']);
  }
  const legacyPeople = ['birthday_legacy', 'birthyear_legacy', 'deathday_legacy'];
  const people = await store.rows('people', legacyPeople.join(', '), legacyPeople);

  for (const [table, rows] of Object.entries(simple)) {
    for (const r of rows) {
      if (r.date_legacy == null) continue;
      const c = convertDate(def, r.date_legacy);
      if (!c) {
        out.unparsed.push(`${table} ${r.id}: "${r.date_legacy}"`);
        continue;
      }
      await save(table, table, r.id, r.date_legacy, c, { date_day: c.day, date_precision: c.precision, date_legacy: null });
    }
  }

  for (const r of people) {
    if (r.birthday_legacy != null || r.birthyear_legacy != null) {
      const label = [r.birthday_legacy, r.birthyear_legacy].filter((x) => x != null).join(' ');
      const c = convertBirth(def, r.birthday_legacy, r.birthyear_legacy);
      if (!c) {
        out.unparsed.push(`people ${r.id} birth: "${label}"`);
      } else {
        await save('people', 'people birth', r.id, label, c, {
          birth_day: c.day,
          birth_precision: c.precision,
          birthday_legacy: null,
          birthyear_legacy: null,
        });
      }
    }
    if (r.deathday_legacy != null) {
      const c = convertDate(def, r.deathday_legacy);
      if (!c) {
        out.unparsed.push(`people ${r.id} death: "${r.deathday_legacy}"`);
      } else {
        await save('people', 'people death', r.id, r.deathday_legacy, c, {
          death_day: c.day,
          death_precision: c.precision,
          deathday_legacy: null,
        });
      }
    }
  }
  return out;
}
