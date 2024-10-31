import type { FieldValue } from '@angular/fire/firestore';

export interface ProjectDB {
  access: string[];
  benefit: string;
  interval: string;
  mDesc?: Record<string, string | FieldValue>;
  mReq?: Record<string, number | FieldValue>;
  name: string;
  owner: string;
  rCur: Record<string, number | FieldValue>;
  rReq: Record<string, number | FieldValue>;
  rSkill: Record<string, string | FieldValue>;
  rThresh: Record<string, number | FieldValue>;
}
