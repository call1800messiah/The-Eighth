import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { LoadingTriggerComponent } from './loading-trigger.component';
import { createComponentTestProviders } from '../../../testing/supabase-test-helpers';

describe('LoadingTriggerComponent', () => {
  let component: LoadingTriggerComponent;
  let fixture: ComponentFixture<LoadingTriggerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LoadingTriggerComponent],
      providers: createComponentTestProviders(),
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(LoadingTriggerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
