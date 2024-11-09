import type { CombatState } from '../../shared';
import type { AllowedAttribute } from './allowed-attribute';

export interface Rules {
  allowedAttributes: AllowedAttribute[];
  hitLocations: Record<string, string>;
  states: CombatState[];
}
