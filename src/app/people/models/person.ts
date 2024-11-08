import type { Advantage, CombatState, Disadvantage, Feat, Skill, Spell } from '../../shared';
import type { AccessControlledItem } from '../../core/models/access-controlled-item';
import type { Relative } from './relative';
import type { Location } from './location';

export interface Person extends AccessControlledItem {
  id: string;
  advantages?: Advantage[];
  banner: string;
  birthday: string;
  birthyear: number;
  children?: Relative[];
  culture: string;
  deathday: string;
  disadvantages?: Disadvantage[];
  feats?: Feat[];
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
  skills?: Skill[];
  spells?: Spell[];
  states: CombatState[];
  tags?: string[];
  title: string;
  xp?: number;
}
