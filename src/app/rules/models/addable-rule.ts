export type AddableRule = {
  id: string;
  name: string;
  rules?: string;
  type: string;
} & (AdvantageMeta | DisadvantageMeta | FeatMeta | LiturgyMeta | SkillMeta | SpellMeta);

export interface AdvantageMeta {
  cost: string;
  description?: string;
  hasLevels?: boolean;                      // For advantages that can be taken multiple times
  requirements?: string;
  requiresDetails?: boolean;                // For advantages that can be customized like immunities
  type: 'advantage';
}

export interface DisadvantageMeta {
  cost: string;
  description?: string;
  hasLevels?: boolean;                      // For disadvantages that can be taken multiple times
  requirements?: string;
  requiresDetails?: boolean;                // For disadvantages that can be customized like immunities
  type: 'disadvantage';
}

export interface FeatMeta {
  category: string;
  combatTechniques?: string;                // Only for combat feats: The combat techniques the feat can be used with
  cost: string;
  description?: string;
  hasLevels?: boolean;                      // For feats that can be taken multiple times
  prevalence?: string;                      // Only 4e: The prevalence of the feat
  requirements?: string;
  requiresDetails?: boolean;                // For feats that can be customized like skill specializations
  type: 'feat';
  usage?: 'passive' | 'basic' | 'special';  // Only for 5e combat feats: Whether the feat is passive or active
}

export interface LiturgyMeta {
  attributeOne?: string;                    // Only 5e
  attributeTwo?: string;                    // Only 5e
  attributeThree?: string;                  // Only 5e
  category?: string;
  castingTime: string;
  cost?: string;                            // Only 5e
  description?: string;
  duration: string;
  increaseFactor?: string;                  // Only 5e
  level?: string;                           // Only 4e
  prevalence?: string;
  range: string;
  target?: string;
  type: 'liturgy';
}

export interface SkillMeta {
  alternatives?: string;                    // Only 4e: For skills that can be replaced by other skills
  applications?: string;                    // Only 5e: The default applications of the skill
  attributeOne: string;
  attributeTwo: string;
  attributeThree: string;
  category: string;
  encumbrance?: string;
  increaseFactor?: string;
  specializations?: string;                 // Only 4e: The specializations of the skill
  type: 'skill';
}

export interface SpellMeta {
  attributeOne: string;
  attributeTwo: string;
  attributeThree: string;
  category: string;
  castingTime: string;
  cost: string;
  description?: string;
  duration: string;
  increaseFactor?: string;
  modifier?: string;                        // Only for spells that can be passively resisted
  prevalence?: string;
  range: string;
  reversalis?: string;
  target?: string;
  type: 'spell';
  vaiants?: string;
}
