import type { Attribute } from '../../shared';

export interface PersonDB {
  advantages?: Record<string, {
    details?: string;
    level?: string;
  }>
  access: string[];
  attributes?: Attribute[];
  banner?: string;
  birth_day: number | null;
  birth_precision: string | null;
  birthday_legacy: string | null;
  birthyear_legacy: number | null;
  cantrips?: Record<string, number>;
  children?: string[];
  culture: string;
  death_day: number | null;
  death_precision: string | null;
  deathday_legacy: string | null;
  disadvantages?: Record<string, {
    details?: string;
    level?: string;
  }>;
  feats?: Record<string, {
    details?: string;
    level?: string;
  }>;
  height: number;
  image: string;
  liturgys?: Record<string, number>;
  location?: string;
  name: string;
  owner: string;
  parents?: string[];
  partners?: string[];
  pc: boolean;
  profession: string;
  race: string;
  relatives?: Record<string, string[]>;
  siblings?: string[];
  skills?: Record<string, number>;
  spells?: Record<string, number>;
  tags?: string[];
  title: string;
  xp?: number;
  xpSpent?: number | null;
}
