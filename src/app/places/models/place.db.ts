import type { FieldValue } from '@angular/fire/firestore';
import { PlaceType } from './place-type.enum';

export interface PlaceDB {
  access: string[];
  image?: string;
  inhabitants?: string;
  isPrivate: boolean;
  name: string;
  owner: string;
  parentId?: string | FieldValue;
  type: PlaceType;
}
