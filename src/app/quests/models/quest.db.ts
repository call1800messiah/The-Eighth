import firebase from 'firebase/compat/app';
import FieldValue = firebase.firestore.FieldValue;
import { QuestType } from './quest-type.enum';

export interface QuestDB {
  access: string[];
  completed: boolean;
  description: string;
  name: string;
  owner: string;
  parentId?: string | FieldValue;
  type: QuestType;
}
