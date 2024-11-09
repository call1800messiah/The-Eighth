export type AddableRule = {
  id: string;
  name: string;
  rules?: string;
  type: string;
} & (AdvantageMeta | DisadvantageMeta | FeatMeta | SkillMeta | SpellMeta);

export interface AdvantageMeta {
  cost: string;
  description?: string;
  requirements?: string;
  requiresDetails?: boolean;                // For advantages that can be customized like immunities
  type: 'advantage';
}

export interface DisadvantageMeta {
  cost: string;
  description?: string;
  requirements?: string;
  requiresDetails?: boolean;                // For disadvantages that can be customized like immunities
  type: 'disadvantage';
}

export interface FeatMeta {
  category: string;
  combatTechniques?: string;                // Only for combat feats: The combat techniques the feat can be used with
  cost: string;
  description?: string;
  prevalence?: string;                      // Only 4e: The prevalence of the feat
  requirements?: string;
  requiresDetails?: boolean;                // For feats that can be customized like skill specializations
  type: 'feat';
  usage?: 'passive' | 'basic' | 'special';  // Only for combat feats: Whether the feat is passive or active
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
  target?: string;                          // Only 5e: For spells that require a target
  type: 'spell';
}