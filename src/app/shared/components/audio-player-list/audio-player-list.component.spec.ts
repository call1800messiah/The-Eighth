import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { AudioPlayerListComponent } from './audio-player-list.component';
import { createComponentTestProviders } from '../../../testing/supabase-test-helpers';

describe('AudioPlayerListComponent', () => {
  let component: AudioPlayerListComponent;
  let fixture: ComponentFixture<AudioPlayerListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AudioPlayerListComponent],
      providers: createComponentTestProviders(),
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(AudioPlayerListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
