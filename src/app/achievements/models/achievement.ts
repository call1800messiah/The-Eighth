import { Person } from '../../people/models/person';

export interface Achievement {
  description: string;
  icon: string;
  id: string;
  isPrivate: boolean;
  name: string;
  owner: string;
  people: Person[];
  unlocked: Date;
}
