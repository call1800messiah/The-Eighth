import type { CombatState } from '../../shared';
import type { CalendarsConfig } from '../../core/calendar/calendars-config';
import type { AllowedAttribute } from './allowed-attribute';

export interface Rules {
  addableRuleTypes: Record<string, Record<string, string>>;
  allowedAttributes: AllowedAttribute[];
  calendars: CalendarsConfig;
  edition: number;
  hitLocations: Record<string, string>;
  states: CombatState[];
}
