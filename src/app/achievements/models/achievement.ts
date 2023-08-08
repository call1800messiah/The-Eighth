import { Person } from '../../people/models/person';
import { AccessControlledItem } from '../../core/models/access-controlled-item';

export interface Achievement extends AccessControlledItem {
  description: string;
  icon: string;
  id: string;
  name: string;
  people: Person[];
  unlocked: Date;
}
