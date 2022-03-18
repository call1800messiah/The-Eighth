import firebase from 'firebase';
import FieldValue = firebase.firestore.FieldValue;

export interface ProjectDB {
  benefit: string;
  interval: string;
  isPrivate: boolean;
  mDesc?: Record<string, string | FieldValue>;
  mReq?: Record<string, number | FieldValue>;
  name: string;
  owner: string;
  rCur: Record<string, number | FieldValue>;
  rReq: Record<string, number | FieldValue>;
  rSkill: Record<string, string | FieldValue>;
}
