import { QuestType } from './quest-type.enum';

export interface Quest {
  id: string;
  completed: boolean;
  description: string;
  name: string;
  type: QuestType;
  owner?: string;
  parent?: {
    id: string;
    name?: string;
  };
  isPrivate?: boolean;
}
