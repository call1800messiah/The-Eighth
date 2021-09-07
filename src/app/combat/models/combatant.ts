import { Person } from '../../people/models/person';
import { Attribute } from '../../shared/models/attribute';
import { Observable } from 'rxjs';
import { CombatState } from './combat-state';

export interface Combatant {
  id: string;
  active: boolean;
  attributes: Observable<Attribute[]>;
  initiative: number;
  name?: string;
  person?: Person;
  states?: CombatState[];
}
