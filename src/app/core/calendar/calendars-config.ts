import type { CalendarDefinition } from '@the-eighth/fantasy-calendar';

/** The calendars a tenant defines in its rules.json. `default` is a calendar id. */
export interface CalendarsConfig {
  default: string;
  list: CalendarDefinition[];
}
