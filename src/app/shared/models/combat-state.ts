import type { Modifier } from './modifier';

export interface CombatState {
  exclusive?: boolean;
  link?: string;
  name: string;
  modifiers: Modifier[];
}
