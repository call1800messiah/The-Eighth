import type { AddableRule } from '../../rules';
import type { Capability } from './capability';
import type { Person } from './person';

export interface EditCapabilityProps {
  capability?: Capability;
  person: Person;
  type?: AddableRule['type'];
}
