import firebase from 'firebase/compat';
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
  rThresh: Record<string, number | FieldValue>;
}
