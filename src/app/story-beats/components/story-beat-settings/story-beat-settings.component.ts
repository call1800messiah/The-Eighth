import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { BeatSession } from '../../models';
import type { PopoverChild } from '../../../shared';
import { StoryBeatService, StoryBeatState } from '../../services/story-beat.service';


export interface StoryBeatSettingsProps {
  flowId: string;
}


/** Changes the session of a flow. Shown in the app popover. */
@Component({
  selector: 'app-story-beat-settings',
  templateUrl: './story-beat-settings.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class StoryBeatSettingsComponent implements OnInit, PopoverChild {
  private beats = inject(StoryBeatService);

  @Input() props: StoryBeatSettingsProps;
  @Output() dismissPopover = new EventEmitter<boolean>();

  state$: Observable<StoryBeatState>;


  ngOnInit(): void {
    this.state$ = this.beats.getState(this.props.flowId);
  }


  setInterval(session: BeatSession, value: number): void {
    this.beats.setIntervalMinutes(session.id, StoryBeatSettingsComponent.clampInterval(value));
  }


  toggleMuted(session: BeatSession, personId: string): void {
    this.beats.setMuted(session, personId, !session.mutedPersonIds.includes(personId));
  }


  /** Matches the database's CHECK on interval_minutes. */
  static clampInterval(value: number): number {
    const minutes = Math.round(Number(value) || 60);
    return Math.min(480, Math.max(5, minutes));
  }
}
