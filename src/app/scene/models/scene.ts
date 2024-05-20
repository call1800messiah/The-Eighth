import type { Place } from '../../places/models/place';
import type { Person } from '../../people/models/person';
import type { AccessControlledItem } from '../../core/models/access-controlled-item';

export interface Scene extends AccessControlledItem {
  name: string;
  people: Person[];
  place?: string | Place;
}
