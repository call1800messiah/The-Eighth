import type { Attack } from './attack';

export interface Enemy {
  attacks: Attack[];
  id: string;
  name: string;
  stats: Record<Shortcode, InfoValue>;
}

export type Shortcode = string;

export type InfoValue = number | string;
