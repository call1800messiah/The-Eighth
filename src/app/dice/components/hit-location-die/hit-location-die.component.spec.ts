import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { HitLocationDieComponent } from './hit-location-die.component';
import { createComponentTestProviders } from '../../../testing/supabase-test-helpers';

describe('HitLocationDieComponent', () => {
  let component: HitLocationDieComponent;
  let fixture: ComponentFixture<HitLocationDieComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HitLocationDieComponent],
      providers: createComponentTestProviders(),
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(HitLocationDieComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
