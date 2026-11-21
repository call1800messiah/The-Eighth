import { ChangeDetectionStrategy, Component, ElementRef, Input, ViewChild, inject } from '@angular/core';
import { combineLatest, Observable, of, ReplaySubject, timer } from 'rxjs';
import { distinctUntilChanged, map, switchMap, tap } from 'rxjs/operators';
import { faCog, faPlay, faStop } from '@fortawesome/free-solid-svg-icons';

import type { BeatKind, BeatSession, BeatTracker } from '../../models';
import { BEAT_KINDS } from '../../models';
import { AuthService } from '../../../core/services/auth.service';
import { PopoverService } from '../../../core/services/popover.service';
import { StoryBeatService, StoryBeatState } from '../../services/story-beat.service';
import { formatIdle, idleRatio, idleSeconds, sessionActiveSeconds } from '../../services/beat-clock';
import { StoryBeatSettingsComponent } from '../story-beat-settings/story-beat-settings.component';


export interface BeatChip {
  tracker: BeatTracker;
  idle: number;
  ratio: number;
  /** Fill width in percent, capped at 100. */
  fill: number;
  overdue: boolean;
  /** Fill colour, faded from green (fresh) to red (at the interval). */
  color: string;
  title: string;
}


export interface BeatBarView {
  /** Null until the session is first started on this flow. */
  session: BeatSession | null;
  running: boolean;
  chips: BeatChip[];
  sessionTime: string;
}


/** The PC a beat is being logged for, while the GM picks its kind. */
interface PendingBeat {
  personId: string;
  personName: string;
}


/** How often idle times are recomputed. The fade needs nothing finer. */
const TICK_MS = 5000;
/** How often to have the database stop this session if it has been forgotten. */
const IDLE_CHECK_MS = 60_000;


@Component({
  selector: 'app-story-beat-bar',
  templateUrl: './story-beat-bar.component.html',
  styleUrls: ['./story-beat-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class StoryBeatBarComponent {
  private auth = inject(AuthService);
  private beats = inject(StoryBeatService);
  private popover = inject(PopoverService);

  readonly kinds = BEAT_KINDS;
  readonly faCog = faCog;
  readonly faPlay = faPlay;
  readonly faStop = faStop;

  view$: Observable<BeatBarView | null>;
  pendingBeat: PendingBeat | null = null;
  saving = false;

  private view: BeatBarView | null = null;
  private currentFlowId: string;
  private lastIdleCheckMs = 0;
  private flowId$ = new ReplaySubject<string>(1);


  @Input({ required: true })
  set flowId(flowId: string) {
    this.currentFlowId = flowId;
    this.pendingBeat = null;
    this.lastIdleCheckMs = 0;
    this.flowId$.next(flowId);
  }


  /** The dialog only exists while a beat is pending; opening it makes the page behind inert. */
  @ViewChild('tagPrompt')
  set tagPrompt(dialog: ElementRef<HTMLDialogElement> | undefined) {
    if (dialog && !dialog.nativeElement.open) {
      dialog.nativeElement.showModal();
    }
  }


  constructor() {
    // Players never subscribe: the tables are GM-only anyway, and this keeps
    // their clients from opening realtime channels for nothing.
    const isGM$ = this.auth.user$.pipe(
      map(user => !!user?.isGM),
      distinctUntilChanged(),
    );
    this.view$ = combineLatest([isGM$, this.flowId$.pipe(distinctUntilChanged())]).pipe(
      switchMap(([isGM, flowId]) => isGM
        ? combineLatest([this.beats.getState(flowId), timer(0, TICK_MS)]).pipe(
            map(([state]) => StoryBeatBarComponent.buildView(state, Date.now())),
          )
        : of(null)),
      tap(view => {
        this.view = view;
        this.stopIfIdle(view);
      }),
    );
  }


  static buildView(state: StoryBeatState, nowMs: number): BeatBarView {
    const { session, trackers } = state;
    if (!session) {
      return { session: null, running: false, chips: [], sessionTime: '' };
    }

    const chips = trackers.map((tracker): BeatChip => {
      const idle = idleSeconds(session, tracker.lastBeatActiveSeconds, nowMs);
      const ratio = idleRatio(idle, session.intervalMinutes);
      return {
        tracker,
        idle,
        ratio,
        fill: Math.round(Math.min(1, ratio) * 100),
        overdue: ratio >= 1,
        color: StoryBeatBarComponent.fadeColor(ratio),
        title: StoryBeatBarComponent.chipTitle(tracker, idle),
      };
    });

    return {
      session,
      running: !session.pausedAt,
      chips,
      sessionTime: formatIdle(sessionActiveSeconds(session, nowMs)),
    };
  }


  /** Green at 0, through yellow, to red at the interval and beyond. */
  static fadeColor(ratio: number): string {
    const hue = Math.round(120 * (1 - Math.min(1, Math.max(0, ratio))));
    return `hsl(${hue}, 70%, 45%)`;
  }


  static chipTitle(tracker: BeatTracker, idle: number): string {
    const kinds = BEAT_KINDS
      .filter(({ kind }) => tracker.countsByKind[kind])
      .map(({ kind, label }) => `${label} ${tracker.countsByKind[kind]}`);
    const breakdown = kinds.length ? ` (${kinds.join(', ')})` : '';
    return `${tracker.person.name}: seit ${formatIdle(idle)} h ohne Beat · ${tracker.beatCount} Beats${breakdown}`;
  }


  promptBeat(chip: BeatChip): void {
    this.pendingBeat = {
      personId: chip.tracker.person.id,
      personName: chip.tracker.person.name,
    };
  }


  /** Logging happens here, not on the chip click: only this resets the PC's timer. */
  async confirmBeat(kind: BeatKind): Promise<void> {
    const session = this.view?.session;
    if (!session || !this.pendingBeat || this.saving) {
      return;
    }

    this.saving = true;
    const beatId = await this.beats.logBeat(session.id, this.pendingBeat.personId, kind);
    this.saving = false;

    // On failure the prompt stays up so the GM can retry.
    if (beatId) {
      this.pendingBeat = null;
    }
  }


  cancelBeat(): void {
    this.pendingBeat = null;
  }


  toggleRunning(view: BeatBarView): void {
    if (view.running) {
      this.beats.stopSession(view.session.id);
    } else {
      this.beats.startSession(this.currentFlowId);
    }
  }


  openSettings(): void {
    this.popover.showPopover('Storybeats', StoryBeatSettingsComponent, { flowId: this.currentFlowId });
  }


  firstName(name: string): string {
    return StoryBeatBarComponent.firstName(name);
  }


  static firstName(name: string): string {
    return (name ?? '').split(' ')[0];
  }


  private stopIfIdle(view: BeatBarView | null): void {
    const now = Date.now();
    if (view?.running && now - this.lastIdleCheckMs >= IDLE_CHECK_MS) {
      this.lastIdleCheckMs = now;
      this.beats.stopIfIdle(view.session.id);
    }
  }
}
