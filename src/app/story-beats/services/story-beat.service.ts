import { Injectable, inject } from '@angular/core';
import { combineLatest, Observable, of } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';

import type { Person } from '../../people';
import type { BeatKind, BeatSession, BeatTracker, StoryBeat } from '../models';
import { ApiService } from '../../core/services/api.service';
import { PeopleService } from '../../people/services/people.service';
import { RealtimeService } from '../../core/services/supabase-realtime.service';


export interface StoryBeatState {
  /** Null until the session is first started on the flow. */
  session: BeatSession | null;
  /** Every living PC, in name order. The settings popover lists these. */
  pcs: Person[];
  /** The PCs being tracked this session (present, not muted), in name order. */
  trackers: BeatTracker[];
}


/**
 * GM-only spotlight tracker. Both tables are GM-only under RLS, so for anyone
 * else the watch simply returns no rows; the bar additionally only
 * subscribes for GMs.
 *
 * Writes that need a timestamp go through the database functions from
 * migration 011, so the session clock always runs on the database's time.
 */
const STORAGE_INTERVAL = 'storyBeats.lastInterval';


@Injectable({
  providedIn: 'root'
})
export class StoryBeatService {
  private api = inject(ApiService);
  private peopleService = inject(PeopleService);
  private realtime = inject(RealtimeService);

  private states = new Map<string, Observable<StoryBeatState>>();


  /** The session of a flow, if it has one yet, with its trackers. Shared per flow. */
  getState(flowId: string): Observable<StoryBeatState> {
    let state$ = this.states.get(flowId);
    if (!state$) {
      const session$ = this.realtime.watch<any>(
        'beat_sessions',
        query => query.select('*, story_beats(*)').eq('flow_id', flowId),
        `beat_sessions_flow_${flowId}`,
        // Logging a beat writes story_beats only; without this the bar
        // would not notice beats logged from another tab.
        ['story_beats'],
      ).pipe(
        map(rows => rows.length ? StoryBeatService.transformSession(rows[0]) : null),
        catchError((error) => {
          console.error(error);
          return of(null);
        }),
      );

      state$ = combineLatest([
        session$,
        this.peopleService.getPeople(),
      ]).pipe(
        map(([session, people]) => StoryBeatService.buildState(session, people)),
        shareReplay({ bufferSize: 1, refCount: true }),
      );
      this.states.set(flowId, state$);
    }
    return state$;
  }


  /** Creates the flow's session, using the last interval set, or starts it again. */
  async startSession(flowId: string): Promise<boolean> {
    const { error } = await this.api.rpc('start_beat_session', {
      p_flow_id: flowId,
      p_interval_minutes: StoryBeatService.lastInterval(),
    });
    return StoryBeatService.ok(error);
  }


  async stopSession(sessionId: string): Promise<boolean> {
    const { error } = await this.api.rpc('stop_beat_session', { p_session_id: sessionId });
    return StoryBeatService.ok(error);
  }


  /** The database decides, so this is a no-op until the session has been idle long enough. */
  async stopIfIdle(sessionId: string): Promise<boolean> {
    const { error } = await this.api.rpc('stop_idle_beat_session', { p_session_id: sessionId });
    return StoryBeatService.ok(error);
  }


  /** Logs a beat and returns its id, or null on failure. */
  async logBeat(sessionId: string, personId: string, kind: BeatKind): Promise<string | null> {
    const { data, error } = await this.api.rpc('log_story_beat', {
      p_session_id: sessionId,
      p_person_id: personId,
      p_kind: kind,
    });
    if (!StoryBeatService.ok(error)) {
      return null;
    }
    return (data as any)?.id ?? null;
  }


  async setIntervalMinutes(sessionId: string, intervalMinutes: number): Promise<boolean> {
    StoryBeatService.rememberInterval(intervalMinutes);
    const { error } = await this.api.from('beat_sessions')
      .update({ interval_minutes: Math.round(intervalMinutes) })
      .eq('id', sessionId);
    return StoryBeatService.ok(error);
  }


  async setMuted(session: BeatSession, personId: string, muted: boolean): Promise<boolean> {
    const others = session.mutedPersonIds.filter(id => id !== personId);
    const mutedPersonIds = muted ? [...others, personId] : others;
    const { error } = await this.api.from('beat_sessions')
      .update({ muted_person_ids: mutedPersonIds })
      .eq('id', session.id);
    return StoryBeatService.ok(error);
  }


  static buildState(session: BeatSession | null, people: Person[]): StoryBeatState {
    const pcs = people
      .filter(person => person.pc && !person.deathday)
      .sort((a, b) => a.name.localeCompare(b.name, 'de'));

    if (!session) {
      return { session: null, pcs, trackers: [] };
    }

    const trackers = pcs
      .filter(person => !session.mutedPersonIds.includes(person.id))
      .map(person => StoryBeatService.buildTracker(person, session.beats));

    return { session, pcs, trackers };
  }


  static buildTracker(person: Person, beats: StoryBeat[]): BeatTracker {
    const own = beats.filter(beat => beat.personId === person.id);
    const countsByKind: Partial<Record<BeatKind, number>> = {};
    for (const beat of own) {
      if (beat.kind) {
        countsByKind[beat.kind] = (countsByKind[beat.kind] ?? 0) + 1;
      }
    }

    return {
      person,
      lastBeatActiveSeconds: own.reduce((latest, beat) => Math.max(latest, beat.activeSeconds), 0),
      beatCount: own.length,
      countsByKind,
    };
  }


  static transformSession(row: any): BeatSession {
    return {
      id: row.id,
      intervalMinutes: row.interval_minutes,
      startedAt: new Date(row.started_at),
      pausedAt: row.paused_at ? new Date(row.paused_at) : null,
      pausedSeconds: row.paused_seconds ?? 0,
      mutedPersonIds: row.muted_person_ids ?? [],
      beats: (row.story_beats ?? []).map((beat: any): StoryBeat => ({
        id: beat.id,
        personId: beat.person_id,
        kind: beat.kind ?? null,
        activeSeconds: beat.active_seconds,
        createdAt: new Date(beat.created_at),
      })),
    };
  }


  // Storage can be unavailable (private windows, blocked site data).
  private static lastInterval(): number {
    try {
      return Math.round(Number(localStorage.getItem(STORAGE_INTERVAL))) || 60;
    } catch {
      return 60;
    }
  }


  private static rememberInterval(minutes: number): void {
    try {
      localStorage.setItem(STORAGE_INTERVAL, String(minutes));
    } catch {
      // Remembering the setting is a convenience only.
    }
  }


  private static ok(error: any): boolean {
    if (error) {
      console.error(error);
      return false;
    }
    return true;
  }
}
