import { CombatState } from './combat-state';

export interface Rules {
  barTypes: string[];
  hitLocations: Record<string, string>;
  states: CombatState[];
}
