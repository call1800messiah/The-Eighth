import { Modifier } from './modifier.interface';

export interface CombatState {
  name: string;
  modifiers: Modifier[];
}
