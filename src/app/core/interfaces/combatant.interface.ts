import { Person } from './person.interface';
import { Attribute } from './attribute.interface';
import { Observable } from 'rxjs';
import { CombatState } from './combat-state.interface';

export interface Combatant {
  id: string;
  active: boolean;
  attributes: Observable<Attribute[]>;
  initiative: number;
  name?: string;
  person?: Person;
  states?: CombatState[];
}
