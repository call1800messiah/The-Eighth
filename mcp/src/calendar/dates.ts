import { type CalendarDefinition, format, parse } from './engine/index.js';
import calendars from './calendars.json' with { type: 'json' };
import { ToolError } from '../tools/entities.js';

/** The default calendar of the tenant (the only one in use). */
const calendar = ((calendars as { default: string; list: CalendarDefinition[] }).list
  .find(c => c.id === (calendars as { default: string }).default)
  ?? (calendars as { list: CalendarDefinition[] }).list[0]) as CalendarDefinition;

type Columns = Record<string, number | string | null>;

/**
 * A date as Claude writes it → the `<field>_day` / `<field>_precision` columns.
 * undefined: not given. null or '': clear it.
 */
export function parseDateInput(text: string | null | undefined, field: 'birth' | 'death'): Columns | undefined {
  if (text === undefined) return undefined;
  if (text === null || text.trim() === '') return { [`${field}_day`]: null, [`${field}_precision`]: null };
  const date = parse(calendar, text.trim());
  if (!date) {
    throw new ToolError(`${field}: "${text}" is not a date. Use "3. Praios 1010 BF", "Phex 1027 BF" or "1010 BF".`);
  }
  return { [`${field}_day`]: date.day, [`${field}_precision`]: date.precision };
}

/** For every `<x>_day` with a `<x>_precision` sibling, adds `<x>` as formatted text; recurses into embeds. */
export function formatDateColumns<T extends Record<string, unknown>>(row: T): T & Record<string, string> {
  return addDates(row) as T & Record<string, string>;
}

function addDates(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(addDates);
  if (value === null || typeof value !== 'object') return value;
  const out: Record<string, unknown> = {};
  for (const [key, inner] of Object.entries(value)) out[key] = addDates(inner);
  for (const key of Object.keys(out)) {
    if (!key.endsWith('_day')) continue;
    const name = key.slice(0, -4);
    const day = out[key];
    const precision = out[`${name}_precision`];
    if (typeof day === 'number' && (precision === 'day' || precision === 'month' || precision === 'year')) {
      out[name] = format(calendar, { day, precision });
    }
  }
  return out;
}

