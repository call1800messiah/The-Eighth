import type { Quest } from '../../quests/models/quest';
import type { Person } from '../../people/models/person';
import type { Place } from '../../places/models/place';
import type { Note } from '../../notes/models/note';

export type FlowItem =
  | QuestFlowItem
  | PersonFlowItem
  | PlaceFlowItem
  | SessionMarkerFlowItem
  | NoteFlowItem;

interface BaseFlowItem {
  id: string;
  order: number;
}

export interface QuestFlowItem extends BaseFlowItem {
  type: 'quest';
  questId: string;
}

export interface PersonFlowItem extends BaseFlowItem {
  type: 'person';
  personId: string;
}

export interface PlaceFlowItem extends BaseFlowItem {
  type: 'place';
  placeId: string;
}

export interface SessionMarkerFlowItem extends BaseFlowItem {
  type: 'session-marker';
  date: Date;
}

export interface NoteFlowItem extends BaseFlowItem {
  type: 'note';
  noteId: string;
}

// Enriched types (with resolved entity data)
export type EnrichedFlowItem =
  | EnrichedQuestFlowItem
  | EnrichedPersonFlowItem
  | EnrichedPlaceFlowItem
  | SessionMarkerFlowItem
  | EnrichedNoteFlowItem;

export interface EnrichedQuestFlowItem extends QuestFlowItem {
  entity: Quest | null; // null if quest deleted
}

export interface EnrichedPersonFlowItem extends PersonFlowItem {
  entity: Person | null;
}

export interface EnrichedPlaceFlowItem extends PlaceFlowItem {
  entity: Place | null;
}

export interface EnrichedNoteFlowItem extends NoteFlowItem {
  entity: Note | null;
}
