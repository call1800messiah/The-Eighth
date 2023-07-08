import type { CombatState } from '../../shared/models/combat-state';
import type { Relative } from './relative';

export interface Person {
  id: string;
  banner: string;
  birthday: string;
  birthyear: number;
  children?: Relative[];
  culture: string;
  deathday: string;
  height: number;
  image: string;
  isPrivate?: boolean;
  name: string;
  owner?: string;
  parents?: Relative[];
  pc: boolean;
  profession: string;
  race: string;
  siblings?: Relative[];
  states: CombatState[];
  tags?: string[];
  title: string;
}
