import type { Person } from '../../people';

/** Values allowed by the `story_beats.kind` check constraint (migration 011). */
export type BeatKind = 'combat' | 'social' | 'discovery' | 'lore';

export const BEAT_KINDS: { kind: BeatKind; label: string }[] = [
  { kind: 'combat', label: 'Kampf' },
  { kind: 'social', label: 'Sozial' },
  { kind: 'discovery', label: 'Entdeckung' },
  { kind: 'lore', label: 'Lore' },
];


export interface BeatSession {
  id: string;
  intervalMinutes: number;
  startedAt: Date;
  /** Set while the session is paused. */
  pausedAt: Date | null;
  /** Total length of completed pauses. */
  pausedSeconds: number;
  endedAt: Date | null;
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


/** One PC as the overlay shows it. Idle time is computed per tick from these. */
export interface BeatTracker {
  person: Person;
  /** Session clock reading of the latest beat; 0 (session start) if none yet. */
  lastBeatActiveSeconds: number;
  beatCount: number;
  countsByKind: Partial<Record<BeatKind, number>>;
}
