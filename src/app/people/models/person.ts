import type { Attribute, CombatState } from '../../shared';
import type { AccessControlledItem } from '../../core/models/access-controlled-item';
import type { Relative } from './relative';
import type { Location } from './location';
import type { Advantage } from './advantage';
import type { Cantrip } from './cantrip';
import type { Disadvantage } from './disadvantage';
import type { Feat } from './feat';
import type { Skill } from './skill';
import type { Spell } from './spell';
import type { Liturgy } from './liturgy';

export interface Person extends AccessControlledItem {
  /** 'draft' until a GM publishes what Claude created (migration 013). */
  status?: 'draft' | 'published';
  id: string;
  advantages?: Advantage[];
  attributes?: Attribute[];
  /** Rendered URL of the banner, thumb size. */
  banner: string;
  birthday: string;
  birthyear: number;
  cantrips?: Cantrip[];
  children?: Relative[];
  culture: string;
  deathday: string;
  disadvantages?: Disadvantage[];
  feats?: Feat[];
  height: number;
  /** Rendered URL of the portrait, large size. */
  image: string;
  /**
   * Rendered URL of the portrait, thumb size, for avatars. Set together with
   * `image` (PeopleService.transform).
   */
  imageThumb?: string;
  liturgys?: Liturgy[];
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
  xpSpent?: number | null;
}
