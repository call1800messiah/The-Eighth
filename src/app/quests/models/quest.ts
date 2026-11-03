import { QuestType } from './quest-type.enum';
import type { AccessControlledItem } from '../../core/models/access-controlled-item';

export interface Quest extends AccessControlledItem {
  /** 'draft' until a GM publishes what Claude created (migration 013). */
  status?: 'draft' | 'published';
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
