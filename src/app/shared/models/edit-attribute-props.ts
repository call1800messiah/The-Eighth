import type { Attribute } from './attribute';

export interface EditAttributeProps {
  altCollection?: string;
  attribute?: Attribute;
  personId: string;
}
