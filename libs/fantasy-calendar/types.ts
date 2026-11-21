export type Precision = 'day' | 'month' | 'year';

/** An in-game date: an integer day number on the shared day line, plus how precisely it is known. */
export interface InGameDate {
  day: number;
  precision: Precision;
}

/** Calendar parts: month is 0-based, day is 1-based, year is the signed calendar year. */
export interface DateParts {
  year: number;
  month: number;
  day: number;
}

export interface ResolvedDate extends DateParts {
  /** Index into the calendar's week days. */
  weekday: number;
}

export interface MonthDefinition {
  name: string;
  shortName?: string;
  aliases?: string[];
  days: number;
  /** Extra days added in leap years. */
  leapDays?: number;
}

export interface LeapRule {
  /** Evaluated in order; the last rule that matches a year decides. */
  rules: { every: number; offset?: number; leap: boolean }[];
}

export interface CalendarDefinition {
  id: string;
  name: string;
  /** Day number of the first day of year 1. */
  epochDay: number;
  months: MonthDefinition[];
  week: { days: string[]; epochWeekday: number };
  leap?: LeapRule;
  era: { suffix: string; beforeSuffix?: string; hasYearZero: boolean };
}
