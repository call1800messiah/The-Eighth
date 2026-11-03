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
      service.getState('f1').subscribe();
      expect(mockRealtime.watch).toHaveBeenCalledWith(
        'beat_sessions',
        jasmine.any(Function),
        'beat_sessions_flow_f1',
        ['story_beats'],
      );
    });

    it('only asks for the session of the flow', () => {
      service.getState('f1').subscribe();
      const queryFn = mockRealtime.watch.calls.mostRecent().args[1];
      const builder = createMockQueryBuilder();
      queryFn(builder);
      expect(builder.eq).toHaveBeenCalledWith('flow_id', 'f1');
    });

    it('shares the state per flow', () => {
      expect(service.getState('f1')).toBe(service.getState('f1'));
      expect(service.getState('f1')).not.toBe(service.getState('f2'));
    });

    it('lists living PCs in name order when the flow has no session yet', () => {
      let state: StoryBeatState;
      service.getState('f1').subscribe(s => state = s);
      mockRealtime.emitRows('beat_sessions_flow_f1', []);

      expect(state.session).toBeNull();
      expect(state.pcs.map(p => p.id)).toEqual(['p-katun', 'p-lucano', 'p-thalio']);
      expect(state.trackers).toEqual([]);
    });

    it('builds trackers for present PCs from their latest beat', () => {
      let state: StoryBeatState;
      service.getState('f1').subscribe(s => state = s);
      mockRealtime.emitRows('beat_sessions_flow_f1', [sessionRow]);

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
      service.getState('f1').subscribe(s => state = s);
      mockRealtime._watchSubjects['beat_sessions_flow_f1'].error(new Error('boom'));
      expect(state.session).toBeNull();
    });
  });

  describe('session control', () => {
    afterEach(() => localStorage.removeItem('storyBeats.lastInterval'));

    it('starts a session with the last interval set', async () => {
      localStorage.setItem('storyBeats.lastInterval', '45');
      expect(await service.startSession('f1')).toBeTrue();
      expect(mockApi.rpc).toHaveBeenCalledWith('start_beat_session', { p_flow_id: 'f1', p_interval_minutes: 45 });
    });

    it('starts a session with an hour when no interval was set', async () => {
      localStorage.removeItem('storyBeats.lastInterval');
      await service.startSession('f1');
      expect(mockApi.rpc).toHaveBeenCalledWith('start_beat_session', { p_flow_id: 'f1', p_interval_minutes: 60 });
    });

    it('remembers a changed interval', async () => {
      mockApi.from.and.returnValue(createMockQueryBuilder());
      await service.setIntervalMinutes('s1', 90);
      expect(localStorage.getItem('storyBeats.lastInterval')).toBe('90');
    });

    it('stops by id', async () => {
      await service.stopSession('s1');
      await service.stopIfIdle('s1');
      expect(mockApi.rpc).toHaveBeenCalledWith('stop_beat_session', { p_session_id: 's1' });
      expect(mockApi.rpc).toHaveBeenCalledWith('stop_idle_beat_session', { p_session_id: 's1' });
    });

    it('reports a failed call', async () => {
      spyOn(console, 'error');
      mockApi.rpc.and.returnValue(Promise.resolve({ data: null, error: { message: 'nope' } }));
      expect(await service.stopSession('s1')).toBeFalse();
    });
  });

  describe('beats', () => {
    it('logs a beat and returns its id', async () => {
      mockApi.rpc.and.returnValue(Promise.resolve({ data: { id: 'b9' }, error: null }));
      const id = await service.logBeat('s1', 'p-katun', 'lore');
      expect(id).toBe('b9');
      expect(mockApi.rpc).toHaveBeenCalledWith('log_story_beat', {
        p_session_id: 's1',
        p_person_id: 'p-katun',
        p_kind: 'lore',
      });
    });

    it('returns null when logging fails', async () => {
      spyOn(console, 'error');
      mockApi.rpc.and.returnValue(Promise.resolve({ data: null, error: { message: 'closed' } }));
      expect(await service.logBeat('s1', 'p-katun', 'lore')).toBeNull();
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
