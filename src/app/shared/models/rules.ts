import { CombatState } from './combat-state';

export interface Rules {
  hitLocations: Record<string, string>;
  states: CombatState[];
}
