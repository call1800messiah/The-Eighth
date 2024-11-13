import { Observable } from 'rxjs';
import type { Person } from '../../people';
import type { Attribute, CombatState } from '../../shared';

export interface Combatant {
  id: string;
  active: boolean;
  attributes: Observable<Attribute[]>;
  initiative: number;
  name?: string;
  person?: Person;
  states?: CombatState[];
}
