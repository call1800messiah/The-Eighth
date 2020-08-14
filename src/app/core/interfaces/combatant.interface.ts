import { Person } from './person.interface';

export interface Combatant {
  id: string;
  active: boolean;
  initiative: number;
  name?: string;
  person?: Person;
}
