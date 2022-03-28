import { QuestType } from './quest-type.enum';

export interface Quest {
  id: string;
  completed: boolean;
  description: string;
  isPrivate?: boolean;
  name: string;
  owner?: string;
  parent?: {
    id: string;
    name?: string;
  };
  subQuests?: Quest[];
  type: QuestType;
}
