import type { FlowItem } from './flow-item';

export interface Flow {
  id: string;
  campaignId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  access: string[];
  items: FlowItem[];
  collection: 'flows';
}
