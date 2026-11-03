import { ChangeDetectionStrategy, Component, HostListener, OnDestroy, inject } from '@angular/core';
import { combineLatest, Observable, of, timer } from 'rxjs';
import { distinctUntilChanged, map, switchMap, tap } from 'rxjs/operators';
import {
  faChevronDown,
  faChevronUp,
  faCog,
  faPause,
  faPlay,
  faStop,
  faStopwatch,
  faUndo,
} from '@fortawesome/free-solid-svg-icons';

import type { BeatKind, BeatSession, BeatTracker } from '../../models';
import type { Person } from '../../../people';
import { BEAT_KINDS } from '../../models';
import { AuthService } from '../../../core/services/auth.service';
import { StoryBeatService, StoryBeatState } from '../../services/story-beat.service';
import { formatIdle, idleRatio, idleSeconds, sessionActiveSeconds } from '../../services/beat-clock';


export interface BeatChip {
  tracker: BeatTracker;
  /** 1-based number key that logs a beat for this PC; null past 9. */
  hotkey: number | null;
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
  session: BeatSession | null;
  paused: boolean;
  pcs: Person[];
  chips: BeatChip[];
  sessionTime: string;
}


interface LastLogged {
  beatId: string;
  personName: string;
  kind: BeatKind | null;
}


/** How often idle times are recomputed. The fade needs nothing finer. */
const TICK_MS = 5000;
/** How long the tag/undo prompt stays up after logging a beat. */
const TAG_PROMPT_MS = 8000;
const STORAGE_COLLAPSED = 'storyBeats.collapsed';
const STORAGE_INTERVAL = 'storyBeats.lastInterval';


@Component({
  selector: 'app-story-beat-bar',
  templateUrl: './story-beat-bar.component.html',
  styleUrls: ['./story-beat-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class StoryBeatBarComponent implements OnDestroy {
  private auth = inject(AuthService);
  private beats = inject(StoryBeatService);

  readonly kinds = BEAT_KINDS;
  readonly faChevronDown = faChevronDown;
  readonly faChevronUp = faChevronUp;
  readonly faCog = faCog;
  readonly faPause = faPause;
  readonly faPlay = faPlay;
  readonly faStop = faStop;
  readonly faStopwatch = faStopwatch;
  readonly faUndo = faUndo;

  view$: Observable<BeatBarView | null>;
  collapsed = StoryBeatBarComponent.readStorage(STORAGE_COLLAPSED) === 'true';
  showStart = false;
  showSettings = false;
  intervalInput = Number(StoryBeatBarComponent.readStorage(STORAGE_INTERVAL)) || 60;
  lastLogged: LastLogged | null = null;

  private view: BeatBarView | null = null;
  private tagPromptTimeout: ReturnType<typeof setTimeout> | null = null;


  constructor() {
    // Players never subscribe: the tables are GM-only anyway, and this keeps
    // their clients from opening realtime channels for nothing.
    this.view$ = this.auth.user$.pipe(
      map(user => !!user?.isGM),
      distinctUntilChanged(),
      switchMap(isGM => isGM
        ? combineLatest([this.beats.getState(), timer(0, TICK_MS)]).pipe(
            map(([state]) => StoryBeatBarComponent.buildView(state, Date.now())),
          )
        : of(null)),
      tap(view => this.view = view),
    );
  }


  ngOnDestroy(): void {
    this.clearTagPrompt();
  }


  static buildView(state: StoryBeatState, nowMs: number): BeatBarView {
    const { session, pcs, trackers } = state;
    if (!session) {
      return { session: null, paused: false, pcs, chips: [], sessionTime: '' };
    }

    const chips = trackers.map((tracker, index): BeatChip => {
      const idle = idleSeconds(session, tracker.lastBeatActiveSeconds, nowMs);
      const ratio = idleRatio(idle, session.intervalMinutes);
      return {
        tracker,
        hotkey: index < 9 ? index + 1 : null,
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
      paused: !!session.pausedAt,
      pcs,
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


  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.showSettings = false;
      this.showStart = false;
      this.clearTagPrompt();
      return;
    }

    const session = this.view?.session;
    if (!session || event.altKey || event.ctrlKey || event.metaKey || StoryBeatBarComponent.isTyping(event)) {
      return;
    }

    const digit = Number(event.key);
    if (Number.isInteger(digit) && digit >= 1 && digit <= 9) {
      const chip = this.view.chips.find(c => c.hotkey === digit);
      if (chip) {
        event.preventDefault();
        this.logBeat(chip);
      }
    }
  }


  async logBeat(chip: BeatChip): Promise<void> {
    const session = this.view?.session;
    if (!session) {
      return;
    }
    const beatId = await this.beats.logBeat(session.id, chip.tracker.person.id);
    if (!beatId) {
      return;
    }

    this.clearTagPrompt();
    this.lastLogged = {
      beatId,
      personName: StoryBeatBarComponent.firstName(chip.tracker.person.name),
      kind: null,
    };
    this.tagPromptTimeout = setTimeout(() => this.clearTagPrompt(), TAG_PROMPT_MS);
  }


  async tagLastBeat(kind: BeatKind): Promise<void> {
    if (!this.lastLogged) {
      return;
    }
    const nextKind = this.lastLogged.kind === kind ? null : kind;
    if (await this.beats.tagBeat(this.lastLogged.beatId, nextKind)) {
      this.clearTagPrompt();
    }
  }


  async undoLastBeat(): Promise<void> {
    if (this.lastLogged && await this.beats.undoBeat(this.lastLogged.beatId)) {
      this.clearTagPrompt();
    }
  }


  async startSession(): Promise<void> {
    const minutes = StoryBeatBarComponent.clampInterval(this.intervalInput);
    StoryBeatBarComponent.writeStorage(STORAGE_INTERVAL, String(minutes));
    if (await this.beats.startSession(minutes)) {
      this.showStart = false;
    }
  }


  togglePause(session: BeatSession): void {
    if (session.pausedAt) {
      this.beats.resumeSession(session.id);
    } else {
      this.beats.pauseSession(session.id);
    }
  }


  async endSession(session: BeatSession): Promise<void> {
    if (!confirm('Storybeat-Session beenden?')) {
      return;
    }
    if (await this.beats.endSession(session.id)) {
      this.showSettings = false;
      this.clearTagPrompt();
    }
  }


  setInterval(session: BeatSession, value: number): void {
    const minutes = StoryBeatBarComponent.clampInterval(value);
    StoryBeatBarComponent.writeStorage(STORAGE_INTERVAL, String(minutes));
    this.beats.setIntervalMinutes(session.id, minutes);
  }


  toggleMuted(session: BeatSession, person: Person): void {
    this.beats.setMuted(session, person.id, !session.mutedPersonIds.includes(person.id));
  }


  toggleCollapsed(): void {
    this.collapsed = !this.collapsed;
    StoryBeatBarComponent.writeStorage(STORAGE_COLLAPSED, String(this.collapsed));
  }


  isMuted(session: BeatSession, person: Person): boolean {
    return session.mutedPersonIds.includes(person.id);
  }


  firstName(name: string): string {
    return StoryBeatBarComponent.firstName(name);
  }


  private clearTagPrompt(): void {
    if (this.tagPromptTimeout) {
      clearTimeout(this.tagPromptTimeout);
      this.tagPromptTimeout = null;
    }
    this.lastLogged = null;
  }


  /** Matches the database's CHECK on interval_minutes. */
  static clampInterval(value: number): number {
    const minutes = Math.round(Number(value) || 60);
    return Math.min(480, Math.max(5, minutes));
  }


  static firstName(name: string): string {
    return (name ?? '').split(' ')[0];
  }


  private static isTyping(event: KeyboardEvent): boolean {
    const target = event.target as HTMLElement | null;
    if (!target) {
      return false;
    }
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
  }


  // Storage can be unavailable (private windows, blocked site data).
  private static readStorage(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }


  private static writeStorage(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Remembering the setting is a convenience only.
    }
  }
}
