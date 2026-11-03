import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick, discardPeriodicTasks } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';

import { StoryBeatBarComponent } from './story-beat-bar.component';
import { AuthService } from '../../../core/services/auth.service';
import { StoryBeatService, StoryBeatState } from '../../services/story-beat.service';
import type { BeatSession } from '../../models';

describe('StoryBeatBarComponent', () => {
  const start = Date.parse('2026-11-03T18:00:00Z');
  const katun: any = { id: 'p-katun', name: 'Katun Sohn des Weges', pc: true };
  const thalio: any = { id: 'p-thalio', name: 'Thalio', pc: true };

  function session(overrides: Partial<BeatSession> = {}): BeatSession {
    return {
      id: 's1',
      intervalMinutes: 60,
      startedAt: new Date(start),
      pausedAt: null,
      pausedSeconds: 0,
      endedAt: null,
      mutedPersonIds: [],
      beats: [],
      ...overrides,
    };
  }

  function state(s: BeatSession | null): StoryBeatState {
    return StoryBeatService.buildState(s, [thalio, katun]);
  }

  describe('buildView()', () => {
    it('fades from fresh to overdue with idle time', () => {
      const s = session({
        beats: [{ id: 'b1', personId: 'p-katun', kind: null, activeSeconds: 3000, createdAt: new Date() }],
      });
      const view = StoryBeatBarComponent.buildView(state(s), start + 90 * 60_000);

      const [k, t] = view.chips;
      expect(k.tracker.person.id).toBe('p-katun');
      expect(k.hotkey).toBe(1);
      expect(k.idle).toBe(2400);
      expect(k.overdue).toBeFalse();
      expect(k.fill).toBe(67);

      expect(t.hotkey).toBe(2);
      expect(t.idle).toBe(5400);
      expect(t.overdue).toBeTrue();
      expect(t.fill).toBe(100);
      expect(t.color).toBe('hsl(0, 70%, 45%)');

      expect(view.sessionTime).toBe('1:30');
    });

    it('marks a paused session', () => {
      const view = StoryBeatBarComponent.buildView(state(session({ pausedAt: new Date(start) })), start + 60_000);
      expect(view.paused).toBeTrue();
    });

    it('has no chips without a session', () => {
      const view = StoryBeatBarComponent.buildView(state(null), start);
      expect(view.session).toBeNull();
      expect(view.chips).toEqual([]);
      expect(view.pcs.length).toBe(2);
    });
  });

  it('summarises beats by kind in the chip title', () => {
    const title = StoryBeatBarComponent.chipTitle({
      person: thalio,
      lastBeatActiveSeconds: 0,
      beatCount: 3,
      countsByKind: { social: 2, lore: 1 },
    }, 65 * 60);
    expect(title).toBe('Thalio: seit 1:05 h ohne Beat · 3 Beats (Sozial 2, Lore 1)');
  });

  it('clamps the interval to the database range', () => {
    expect(StoryBeatBarComponent.clampInterval(1)).toBe(5);
    expect(StoryBeatBarComponent.clampInterval(1000)).toBe(480);
    expect(StoryBeatBarComponent.clampInterval(NaN)).toBe(60);
  });

  describe('component', () => {
    let fixture: ComponentFixture<StoryBeatBarComponent>;
    let component: StoryBeatBarComponent;
    let user$: BehaviorSubject<any>;
    let state$: BehaviorSubject<StoryBeatState>;
    let beats: jasmine.SpyObj<StoryBeatService>;

    beforeEach(() => {
      user$ = new BehaviorSubject<any>({ id: 'gm', isGM: true });
      state$ = new BehaviorSubject(state(session()));
      beats = jasmine.createSpyObj('StoryBeatService', [
        'getState', 'logBeat', 'tagBeat', 'undoBeat', 'startSession',
        'pauseSession', 'resumeSession', 'endSession', 'setIntervalMinutes', 'setMuted',
      ]);
      beats.getState.and.returnValue(state$);
      beats.logBeat.and.returnValue(Promise.resolve('b-new'));
      beats.tagBeat.and.returnValue(Promise.resolve(true));
      beats.undoBeat.and.returnValue(Promise.resolve(true));

      TestBed.configureTestingModule({
        schemas: [NO_ERRORS_SCHEMA],
        declarations: [StoryBeatBarComponent],
        providers: [
          { provide: AuthService, useValue: { user$ } },
          { provide: StoryBeatService, useValue: beats },
        ],
      });
      fixture = TestBed.createComponent(StoryBeatBarComponent);
      component = fixture.componentInstance;
    });

    it('does not subscribe for players', fakeAsync(() => {
      user$.next({ id: 'player', isGM: false });
      fixture.detectChanges();
      tick();
      expect(beats.getState).not.toHaveBeenCalled();
      expect(fixture.nativeElement.querySelector('.story-beats')).toBeNull();
    }));

    it('logs a beat for the PC under a number key and offers tagging', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }));
      tick();

      expect(beats.logBeat).toHaveBeenCalledWith('s1', 'p-thalio');
      expect(component.lastLogged).toEqual({ beatId: 'b-new', personName: 'Thalio', kind: null });

      component.tagLastBeat('social');
      tick();
      expect(beats.tagBeat).toHaveBeenCalledWith('b-new', 'social');
      expect(component.lastLogged).toBeNull();

      discardPeriodicTasks();
    }));

    it('ignores number keys while typing and with modifiers', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      const input = document.createElement('input');
      document.body.appendChild(input);
      input.dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: '1', altKey: true }));
      tick();
      input.remove();

      expect(beats.logBeat).not.toHaveBeenCalled();
      discardPeriodicTasks();
    }));

    it('drops the tag prompt after a while', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      component.logBeat(component['view'].chips[0]);
      tick();
      expect(component.lastLogged).not.toBeNull();

      tick(8000);
      expect(component.lastLogged).toBeNull();
      discardPeriodicTasks();
    }));

    it('undoes the last beat', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      component.logBeat(component['view'].chips[0]);
      tick();
      component.undoLastBeat();
      tick();

      expect(beats.undoBeat).toHaveBeenCalledWith('b-new');
      expect(component.lastLogged).toBeNull();
      discardPeriodicTasks();
    }));
  });
});
