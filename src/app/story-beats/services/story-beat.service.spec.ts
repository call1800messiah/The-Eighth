import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';

import { StoryBeatService, StoryBeatState } from './story-beat.service';
import { ApiService } from '../../core/services/api.service';
import { PeopleService } from '../../people/services/people.service';
import { RealtimeService } from '../../core/services/supabase-realtime.service';
import {
  createMockApiService,
  createMockQueryBuilder,
  createMockRealtimeService,
} from '../../testing/supabase-test-helpers';

describe('StoryBeatService', () => {
  let service: StoryBeatService;
  let mockApi: ReturnType<typeof createMockApiService>;
  let mockRealtime: ReturnType<typeof createMockRealtimeService>;
  let people$: BehaviorSubject<any[]>;

  const people = [
    { id: 'p-thalio', name: 'Thalio', pc: true },
    { id: 'p-katun', name: 'Katun', pc: true },
    { id: 'p-dead', name: 'Albrecht', pc: true, deathday: '1. Praios' },
    { id: 'p-npc', name: 'Tau', pc: false },
    { id: 'p-lucano', name: 'Lucano', pc: true },
  ];

  const sessionRow = {
    id: 's1',
    interval_minutes: 45,
    started_at: '2026-11-03T18:00:00Z',
    paused_at: null,
    paused_seconds: 120,
    ended_at: null,
    muted_person_ids: ['p-lucano'],
    story_beats: [
      { id: 'b1', person_id: 'p-katun', kind: 'combat', active_seconds: 300, created_at: '2026-11-03T18:05:00Z' },
      { id: 'b2', person_id: 'p-katun', kind: null, active_seconds: 900, created_at: '2026-11-03T18:15:00Z' },
      { id: 'b3', person_id: 'p-katun', kind: 'combat', active_seconds: 600, created_at: '2026-11-03T18:10:00Z' },
    ],
  };

  beforeEach(() => {
    mockApi = createMockApiService();
    mockRealtime = createMockRealtimeService();
    people$ = new BehaviorSubject<any[]>(people);

    TestBed.configureTestingModule({
      providers: [
        StoryBeatService,
        { provide: ApiService, useValue: mockApi },
        { provide: PeopleService, useValue: { getPeople: () => people$ } },
        { provide: RealtimeService, useValue: mockRealtime },
      ],
    });
    service = TestBed.inject(StoryBeatService);
  });

  describe('getState()', () => {
    it('watches open sessions and re-fetches on story_beats changes', () => {
      service.getState().subscribe();
      expect(mockRealtime.watch).toHaveBeenCalledWith(
        'beat_sessions',
        jasmine.any(Function),
        'beat_sessions_open',
        ['story_beats'],
      );
    });

    it('lists living PCs in name order when no session is open', () => {
      let state: StoryBeatState;
      service.getState().subscribe(s => state = s);
      mockRealtime.emitRows('beat_sessions_open', []);

      expect(state.session).toBeNull();
      expect(state.pcs.map(p => p.id)).toEqual(['p-katun', 'p-lucano', 'p-thalio']);
      expect(state.trackers).toEqual([]);
    });

    it('builds trackers for present PCs from their latest beat', () => {
      let state: StoryBeatState;
      service.getState().subscribe(s => state = s);
      mockRealtime.emitRows('beat_sessions_open', [sessionRow]);

      expect(state.session.intervalMinutes).toBe(45);
      expect(state.session.pausedSeconds).toBe(120);
      expect(state.trackers.map(t => t.person.id)).toEqual(['p-katun', 'p-thalio']);

      const katun = state.trackers[0];
      expect(katun.lastBeatActiveSeconds).toBe(900);
      expect(katun.beatCount).toBe(3);
      expect(katun.countsByKind).toEqual({ combat: 2 });

      const thalio = state.trackers[1];
      expect(thalio.lastBeatActiveSeconds).toBe(0);
      expect(thalio.beatCount).toBe(0);
    });

    it('emits a null session when the watch fails', () => {
      let state: StoryBeatState;
      spyOn(console, 'error');
      service.getState().subscribe(s => state = s);
      mockRealtime._watchSubjects['beat_sessions_open'].error(new Error('boom'));
      expect(state.session).toBeNull();
    });
  });

  describe('session control', () => {
    it('starts a session through the database function', async () => {
      expect(await service.startSession(44.6)).toBeTrue();
      expect(mockApi.rpc).toHaveBeenCalledWith('start_beat_session', { p_interval_minutes: 45 });
    });

    it('pauses, resumes and ends by id', async () => {
      await service.pauseSession('s1');
      await service.resumeSession('s1');
      await service.endSession('s1');
      expect(mockApi.rpc).toHaveBeenCalledWith('pause_beat_session', { p_session_id: 's1' });
      expect(mockApi.rpc).toHaveBeenCalledWith('resume_beat_session', { p_session_id: 's1' });
      expect(mockApi.rpc).toHaveBeenCalledWith('end_beat_session', { p_session_id: 's1' });
    });

    it('reports a failed call', async () => {
      spyOn(console, 'error');
      mockApi.rpc.and.returnValue(Promise.resolve({ data: null, error: { message: 'nope' } }));
      expect(await service.pauseSession('s1')).toBeFalse();
    });
  });

  describe('beats', () => {
    it('logs a beat and returns its id', async () => {
      mockApi.rpc.and.returnValue(Promise.resolve({ data: { id: 'b9' }, error: null }));
      const id = await service.logBeat('s1', 'p-katun');
      expect(id).toBe('b9');
      expect(mockApi.rpc).toHaveBeenCalledWith('log_story_beat', {
        p_session_id: 's1',
        p_person_id: 'p-katun',
        p_kind: undefined,
      });
    });

    it('returns null when logging fails', async () => {
      spyOn(console, 'error');
      mockApi.rpc.and.returnValue(Promise.resolve({ data: null, error: { message: 'closed' } }));
      expect(await service.logBeat('s1', 'p-katun')).toBeNull();
    });

    it('tags and undoes a beat by id', async () => {
      const builder = createMockQueryBuilder();
      mockApi.from.and.returnValue(builder);

      await service.tagBeat('b1', 'lore');
      expect(mockApi.from).toHaveBeenCalledWith('story_beats');
      expect(builder.update).toHaveBeenCalledWith({ kind: 'lore' });
      expect(builder.eq).toHaveBeenCalledWith('id', 'b1');

      await service.undoBeat('b1');
      expect(builder.delete).toHaveBeenCalled();
    });
  });

  describe('setMuted()', () => {
    it('adds and removes a PC without duplicates', async () => {
      const builder = createMockQueryBuilder();
      mockApi.from.and.returnValue(builder);
      const session = StoryBeatService.transformSession(sessionRow);

      await service.setMuted(session, 'p-katun', true);
      expect(builder.update).toHaveBeenCalledWith({ muted_person_ids: ['p-lucano', 'p-katun'] });

      await service.setMuted(session, 'p-lucano', true);
      expect(builder.update).toHaveBeenCalledWith({ muted_person_ids: ['p-lucano'] });

      await service.setMuted(session, 'p-lucano', false);
      expect(builder.update).toHaveBeenCalledWith({ muted_person_ids: [] });
    });
  });
});
