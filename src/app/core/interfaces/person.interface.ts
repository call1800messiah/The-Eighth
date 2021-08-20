import { CombatState } from './combat-state.interface';

export interface Person {
  id: string;
  name: string;
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
  owner?: string;
  isPrivate?: boolean;
}
