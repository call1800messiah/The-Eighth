import type { Advantage } from './advantage';
import type { Disadvantage } from './disadvantage';
import type { Feat } from './feat';
import type { Skill } from './skill';
import type { Spell } from './spell';

export type Capability = Advantage | Disadvantage | Feat | Skill | Spell;
