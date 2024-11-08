import type { CombatState } from './combat-state';
import type { AllowedAttribute } from './allowed-attribute';

export interface Rules {
  allowedAttributes: AllowedAttribute[];
  barTypes: string[];
  hitLocations: Record<string, string>;
  states: CombatState[];
}
