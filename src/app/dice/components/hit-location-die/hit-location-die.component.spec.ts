import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HitLocationDieComponent } from './hit-location-die.component';

describe('HitLocationDieComponent', () => {
  let component: HitLocationDieComponent;
  let fixture: ComponentFixture<HitLocationDieComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ HitLocationDieComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(HitLocationDieComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
