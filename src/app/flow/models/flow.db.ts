import type { Timestamp } from '@angular/fire/firestore';

export interface FlowDB {
  access: string[];
  campaignId: string;
  createdBy: string;
  date: Timestamp;
  createdAt: Timestamp;
  items: FlowItemDB[];
  owner: string;
  updatedAt: Timestamp;
  title?: string;
}

export type FlowItemDB =
  | QuestFlowItemDB
  | PersonFlowItemDB
  | PlaceFlowItemDB
  | NoteFlowItemDB;

interface BaseFlowItemDB {
  id: string;
  order: number;
}

export interface QuestFlowItemDB extends BaseFlowItemDB {
  type: 'quest';
  questId: string;
}

export interface PersonFlowItemDB extends BaseFlowItemDB {
  type: 'person';
  personId: string;
}

export interface PlaceFlowItemDB extends BaseFlowItemDB {
  type: 'place';
  placeId: string;
}

export interface NoteFlowItemDB extends BaseFlowItemDB {
  type: 'note';
  noteId: string;
}
