import firebase from 'firebase/compat/app';
import FieldValue = firebase.firestore.FieldValue;
import { PlaceType } from './place-type.enum';

export interface PlaceDB {
  image?: string;
  inhabitants?: string;
  isPrivate: boolean;
  name: string;
  owner: string;
  parentId?: string | FieldValue;
  type: PlaceType;
}
