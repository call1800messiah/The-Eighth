import { QuestType } from './quest-type.enum';
import type { AccessControlledItem } from '../../core/models/access-controlled-item';

export interface Quest extends AccessControlledItem {
  completed: boolean;
  description: string;
  name: string;
  parent?: {
    id: string;
    name?: string;
  };
  subQuests?: Quest[];
  type: QuestType;
}
