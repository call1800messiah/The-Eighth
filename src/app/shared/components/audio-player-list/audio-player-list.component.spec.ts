import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AudioPlayerListComponent } from './audio-player-list.component';

describe('AudioPlayerListComponent', () => {
  let component: AudioPlayerListComponent;
  let fixture: ComponentFixture<AudioPlayerListComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AudioPlayerListComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AudioPlayerListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
