import type { Person } from './person';

export interface SelectPeopleProps {
  onPersonDeselected: (id: string) => void;
  onPersonSelected: (person: Person) => void;
  people: Person[];
  selected: string[];
}
