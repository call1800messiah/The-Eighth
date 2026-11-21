import { QuestType } from './quest-type.enum';

export interface QuestDB {
  access: string[];
  completed: boolean;
  description: string;
  name: string;
  owner: string;
  parentId?: string | null;
  type: QuestType;
}
