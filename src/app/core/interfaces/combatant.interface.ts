import { Person } from './person.interface';
import { Attribute } from './attribute.interface';
import { Observable } from 'rxjs';

export interface Combatant {
  id: string;
  active: boolean;
  attributes: Observable<Attribute[]>;
  initiative: number;
  name?: string;
  person?: Person;
}
