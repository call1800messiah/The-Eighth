import firebase from 'firebase/compat';
import FieldValue = firebase.firestore.FieldValue;

export interface SceneDB {
  access: string[];
  description: string;
  name: string;
  owner: string;
  people: string[];
  place?: string | FieldValue;
}
