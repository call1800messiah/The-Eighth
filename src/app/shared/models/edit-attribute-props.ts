import { Observable } from 'rxjs';
import type { Attribute } from './attribute';

export interface EditAttributeProps {
  altCollection?: string;
  attribute?: Attribute;
  filterAttributes$?: Observable<string[]>;
  personId: string;
}
