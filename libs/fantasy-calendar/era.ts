import { CalendarDefinition } from './types.js';

/** Internal (not exported from index.ts): maps the signed calendar year to a gap-free astronomical year and back. */
export function toAstronomical(def: CalendarDefinition, year: number): number {
  return def.era.hasYearZero ? year : year < 0 ? year + 1 : year;
}

export function fromAstronomical(def: CalendarDefinition, astro: number): number {
  return def.era.hasYearZero ? astro : astro <= 0 ? astro - 1 : astro;
}
