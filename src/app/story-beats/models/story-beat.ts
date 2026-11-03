import type { Person } from '../../people';

/** Values allowed by the `story_beats.kind` check constraint (migration 011). */
export type BeatKind = 'combat' | 'discovery' | 'general' | 'lore' | 'skill' | 'social';

/** In alphabetical order of the labels, which is how the buttons are shown. */
export const BEAT_KINDS: { kind: BeatKind; label: string }[] = [
  { kind: 'general', label: 'Allgemein' },
  { kind: 'discovery', label: 'Entdeckung' },
  { kind: 'skill', label: 'Fähigkeit' },
  { kind: 'combat', label: 'Kampf' },
  { kind: 'lore', label: 'Lore' },
  { kind: 'social', label: 'Sozial' },
];


export interface BeatSession {
  id: string;
  intervalMinutes: number;
  startedAt: Date;
  /** Set while the session is stopped. */
  pausedAt: Date | null;
  /** Total length of completed stops. */
  pausedSeconds: number;
  mutedPersonIds: string[];
  beats: StoryBeat[];
}


export interface StoryBeat {
  id: string;
  personId: string;
  kind: BeatKind | null;
  /** Session clock reading (pauses excluded) when the beat was logged. */
  activeSeconds: number;
  createdAt: Date;
}


/** One PC as the bar shows it. Idle time is computed per tick from these. */
export interface BeatTracker {
  person: Person;
  /** Session clock reading of the latest beat; 0 (session start) if none yet. */
  lastBeatActiveSeconds: number;
  beatCount: number;
  countsByKind: Partial<Record<BeatKind, number>>;
}
