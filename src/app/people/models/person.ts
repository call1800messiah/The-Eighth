import type { CombatState } from '../../shared/models/combat-state';
import type { Relative } from './relative';
import type { Location } from './location';

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
  location?: Location;
  name: string;
  owner?: string;
  parents?: Relative[];
  partners?: Relative[];
  pc: boolean;
  profession: string;
  race: string;
  relatives: Record<string, Relative[]>;
  siblings?: Relative[];
  states: CombatState[];
  tags?: string[];
  title: string;
}
