import type { Timestamp } from '@angular/fire/firestore';

export interface FlowDB {
  campaignId: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  access: string[];
  items: FlowItemDB[];
}

export type FlowItemDB =
  | QuestFlowItemDB
  | PersonFlowItemDB
  | PlaceFlowItemDB
  | SessionMarkerFlowItemDB
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

export interface SessionMarkerFlowItemDB extends BaseFlowItemDB {
  type: 'session-marker';
  date: Timestamp;
}

export interface NoteFlowItemDB extends BaseFlowItemDB {
  type: 'note';
  noteId: string;
}
