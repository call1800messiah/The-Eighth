import { dateOf, parse } from '../libs/fantasy-calendar/index.ts';
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
