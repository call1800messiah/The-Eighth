import firebase from 'firebase/compat/app';
import FieldValue = firebase.firestore.FieldValue;
import { QuestType } from './quest-type.enum';

export interface QuestDB {
  completed: boolean;
  description: string;
  isPrivate?: boolean;
  name: string;
  owner?: string;
  parentId?: string | FieldValue;
  type: QuestType;
}
