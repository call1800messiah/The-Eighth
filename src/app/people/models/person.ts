import { CombatState } from '../../shared/models/combat-state';

export interface Person {
  id: string;
  name: string;
  banner: string;
  birthday: string;
  birthyear: number;
  culture: string;
  deathday: string;
  height: number;
  image: string;
  profession: string;
  race: string;
  title: string;
  pc: boolean;
  states: CombatState[];
  tags?: string[];
  owner?: string;
  isPrivate?: boolean;
}
