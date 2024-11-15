import type { Attribute } from '../../shared';

export interface PersonDB {
  advantages?: Record<string, {
    details?: string;
    level?: string;
  }>
  access: string[];
  attributes?: Attribute[];
  banner?: string;
  birthday: string;
  birthyear: number;
  children?: string[];
  culture: string;
  deathday: string;
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
}
