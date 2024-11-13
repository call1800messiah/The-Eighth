import type { CombatState } from '../../shared';
import type { AllowedAttribute } from './allowed-attribute';

export interface Rules {
  addableRuleTypes: Record<string, Record<string, string>>;
  allowedAttributes: AllowedAttribute[];
  edition: number;
  hitLocations: Record<string, string>;
  states: CombatState[];
}
