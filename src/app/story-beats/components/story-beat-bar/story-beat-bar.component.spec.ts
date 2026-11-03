import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick, discardPeriodicTasks } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';

import { StoryBeatBarComponent } from './story-beat-bar.component';
import { AuthService } from '../../../core/services/auth.service';
import { PopoverService } from '../../../core/services/popover.service';
import { StoryBeatSettingsComponent } from '../story-beat-settings/story-beat-settings.component';
import { StoryBeatService, StoryBeatState } from '../../services/story-beat.service';
import type { BeatSession } from '../../models';
import { BEAT_KINDS } from '../../models';

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
      expect(k.idle).toBe(2400);
      expect(k.overdue).toBeFalse();
      expect(k.fill).toBe(67);

      expect(t.idle).toBe(5400);
      expect(t.overdue).toBeTrue();
      expect(t.fill).toBe(100);
      expect(t.color).toBe('hsl(0, 70%, 45%)');

      expect(view.sessionTime).toBe('1:30');
    });

    it('marks a stopped session', () => {
      const view = StoryBeatBarComponent.buildView(state(session({ pausedAt: new Date(start) })), start + 60_000);
      expect(view.running).toBeFalse();
    });

    it('has no chips without a session', () => {
      const view = StoryBeatBarComponent.buildView(state(null), start);
      expect(view.session).toBeNull();
      expect(view.chips).toEqual([]);
    });
  });

  it('summarises beats by kind in the chip title', () => {
    const title = StoryBeatBarComponent.chipTitle({
      person: thalio,
      lastBeatActiveSeconds: 0,
      beatCount: 3,
      countsByKind: { social: 2, lore: 1 },
    }, 65 * 60);
    expect(title).toBe('Thalio: seit 1:05 h ohne Beat · 3 Beats (Lore 1, Sozial 2)');
  });

  it('offers the kinds in alphabetical order of their labels', () => {
    const labels = BEAT_KINDS.map(k => k.label);
    expect(labels).toEqual(['Allgemein', 'Entdeckung', 'Fähigkeit', 'Kampf', 'Lore', 'Sozial']);
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
        'getState', 'logBeat', 'startSession', 'stopSession', 'stopIfIdle',
      ]);
      beats.getState.and.returnValue(state$);
      beats.logBeat.and.returnValue(Promise.resolve('b-new'));

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
      component.flowId = 'f1';
    });

    it('does not subscribe for players', fakeAsync(() => {
      user$.next({ id: 'player', isGM: false });
      fixture.detectChanges();
      tick();
      expect(beats.getState).not.toHaveBeenCalled();
      expect(fixture.nativeElement.querySelector('.story-beats')).toBeNull();
    }));

    it('reads the state of its flow and follows a change of flow', fakeAsync(() => {
      fixture.detectChanges();
      tick();
      expect(beats.getState).toHaveBeenCalledWith('f1');

      component.promptBeat(component['view'].chips[0]);
      component.flowId = 'f2';
      tick();

      expect(beats.getState).toHaveBeenCalledWith('f2');
      expect(component.pendingBeat).toBeNull();
      discardPeriodicTasks();
    }));

    it('passes its flow to the settings popover', () => {
      const popover = TestBed.inject(PopoverService);
      spyOn(popover, 'showPopover');
      component.openSettings();
      expect(popover.showPopover).toHaveBeenCalledWith('Storybeats', StoryBeatSettingsComponent, { flowId: 'f1' });
    });

    it('asks for a kind and only logs once one is chosen', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      component.promptBeat(component['view'].chips[1]);
      tick();

      expect(beats.logBeat).not.toHaveBeenCalled();
      expect(component.pendingBeat).toEqual({ personId: 'p-thalio', personName: 'Thalio' });

      component.confirmBeat('social');
      tick();
      expect(beats.logBeat).toHaveBeenCalledOnceWith('s1', 'p-thalio', 'social');
      expect(component.pendingBeat).toBeNull();

      discardPeriodicTasks();
    }));

    it('keeps the prompt up until a choice is made', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      component.promptBeat(component['view'].chips[0]);
      tick(60_000);

      expect(component.pendingBeat).not.toBeNull();
      expect(beats.logBeat).not.toHaveBeenCalled();
      discardPeriodicTasks();
    }));

    it('shows the prompt as a modal dialog that Escape cannot close', fakeAsync(() => {
      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      fixture.nativeElement.querySelector('.chip').click();
      fixture.detectChanges();

      const dialog: HTMLDialogElement = fixture.nativeElement.querySelector('dialog');
      expect(dialog.open).toBeTrue();
      expect(dialog.matches(':modal')).toBeTrue();
      expect(dialog.textContent).not.toContain('Beat für');

      const cancel = new Event('cancel', { cancelable: true });
      dialog.dispatchEvent(cancel);
      expect(cancel.defaultPrevented).toBeTrue();
      expect(component.pendingBeat).not.toBeNull();

      (dialog.querySelector('.btn.borderless') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('dialog')).toBeNull();
      expect(beats.logBeat).not.toHaveBeenCalled();
      discardPeriodicTasks();
    }));

    it('does not log a beat when cancelled', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      component.promptBeat(component['view'].chips[0]);
      component.cancelBeat();
      tick();

      expect(component.pendingBeat).toBeNull();
      expect(beats.logBeat).not.toHaveBeenCalled();
      discardPeriodicTasks();
    }));

    it('keeps the prompt up when logging fails', fakeAsync(() => {
      beats.logBeat.and.returnValue(Promise.resolve(null));
      fixture.detectChanges();
      tick();

      component.promptBeat(component['view'].chips[0]);
      component.confirmBeat('lore');
      tick();

      expect(component.pendingBeat).not.toBeNull();
      expect(component.saving).toBeFalse();
      discardPeriodicTasks();
    }));

    it('logs one beat when a choice is clicked twice', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      component.promptBeat(component['view'].chips[0]);
      component.confirmBeat('lore');
      component.confirmBeat('lore');
      tick();

      expect(beats.logBeat).toHaveBeenCalledTimes(1);
      discardPeriodicTasks();
    }));

    it('creates or restarts the session from the start button', fakeAsync(() => {
      state$.next(state(null));
      fixture.detectChanges();
      tick();

      component.toggleRunning(component['view']);
      expect(beats.startSession).toHaveBeenCalledOnceWith('f1');

      state$.next(state(session({ pausedAt: new Date(start) })));
      tick(5000);
      component.toggleRunning(component['view']);
      expect(beats.startSession).toHaveBeenCalledTimes(2);
      expect(beats.stopSession).not.toHaveBeenCalled();
      discardPeriodicTasks();
    }));

    it('stops a running session', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      component.toggleRunning(component['view']);
      expect(beats.stopSession).toHaveBeenCalledOnceWith('s1');
      expect(beats.startSession).not.toHaveBeenCalled();
      discardPeriodicTasks();
    }));

    it('disables the chips while the session is stopped', fakeAsync(() => {
      state$.next(state(session({ pausedAt: new Date(start) })));
      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.chip').disabled).toBeTrue();
      discardPeriodicTasks();
    }));

    it('has the database check for a forgotten session once a minute while running', fakeAsync(() => {
      fixture.detectChanges();
      tick();
      expect(beats.stopIfIdle).toHaveBeenCalledOnceWith('s1');

      tick(55_000);
      expect(beats.stopIfIdle).toHaveBeenCalledTimes(1);

      tick(5_000);
      expect(beats.stopIfIdle).toHaveBeenCalledTimes(2);
      discardPeriodicTasks();
    }));

    it('does not check a stopped session', fakeAsync(() => {
      state$.next(state(session({ pausedAt: new Date(start) })));
      fixture.detectChanges();
      tick(120_000);

      expect(beats.stopIfIdle).not.toHaveBeenCalled();
      discardPeriodicTasks();
    }));
  });
});
