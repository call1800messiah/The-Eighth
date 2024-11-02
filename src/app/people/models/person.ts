import type { CombatState } from '../../shared/models/combat-state';
import type { Relative } from './relative';
import type { Location } from './location';
import type { AccessControlledItem } from '../../core/models/access-controlled-item';

export interface Person extends AccessControlledItem {
  id: string;
  banner: string;
  birthday: string;
  birthyear: number;
  children?: Relative[];
  culture: string;
  deathday: string;
  height: number;
  image: string;
  location?: Location;
  name: string;
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
  xp?: number;
}
