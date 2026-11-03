import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { StoryBeatSettingsComponent } from './story-beat-settings.component';
import { StoryBeatService } from '../../services/story-beat.service';
import type { BeatSession } from '../../models';

describe('StoryBeatSettingsComponent', () => {
  let fixture: ComponentFixture<StoryBeatSettingsComponent>;
  let component: StoryBeatSettingsComponent;
  let beats: jasmine.SpyObj<StoryBeatService>;
  const session = { id: 's1', mutedPersonIds: ['p-absent'] } as BeatSession;

  beforeEach(() => {
    beats = jasmine.createSpyObj('StoryBeatService', ['getState', 'setIntervalMinutes', 'setMuted']);
    beats.getState.and.returnValue(of({ session: null, pcs: [], trackers: [] }));

    TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      declarations: [StoryBeatSettingsComponent],
      providers: [{ provide: StoryBeatService, useValue: beats }],
    });
    fixture = TestBed.createComponent(StoryBeatSettingsComponent);
    component = fixture.componentInstance;
    component.props = { flowId: 'f1' };
  });

  it('reads the state of its flow', () => {
    component.ngOnInit();
    expect(beats.getState).toHaveBeenCalledWith('f1');
  });

  it('clamps the interval to the database range', () => {
    expect(StoryBeatSettingsComponent.clampInterval(1)).toBe(5);
    expect(StoryBeatSettingsComponent.clampInterval(1000)).toBe(480);
    expect(StoryBeatSettingsComponent.clampInterval(NaN)).toBe(60);
  });

  it('toggles whether a PC is present', () => {
    component.toggleMuted(session, 'p-absent');
    expect(beats.setMuted).toHaveBeenCalledWith(session, 'p-absent', false);

    component.toggleMuted(session, 'p-here');
    expect(beats.setMuted).toHaveBeenCalledWith(session, 'p-here', true);
  });

  it('saves a changed interval, clamped', () => {
    component.setInterval(session, 1000);
    expect(beats.setIntervalMinutes).toHaveBeenCalledWith('s1', 480);
  });
});
