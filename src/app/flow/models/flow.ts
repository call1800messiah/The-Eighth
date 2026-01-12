import type { FlowItem } from './flow-item';
import type { AccessControlledItem } from '../../core/models/access-controlled-item';

export interface Flow extends AccessControlledItem {
  date: Date;
  title?: string;
  items: FlowItem[];
}
