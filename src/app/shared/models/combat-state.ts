import { Modifier } from './modifier';

export interface CombatState {
  exclusive?: boolean;
  name: string;
  modifiers: Modifier[];
}
