import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { PlaceSummaryComponent } from './place-summary.component';
import { createComponentTestProviders } from '../../../testing/supabase-test-helpers';

describe('PlaceSummaryComponent', () => {
  let component: PlaceSummaryComponent;
  let fixture: ComponentFixture<PlaceSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PlaceSummaryComponent],
      providers: createComponentTestProviders(),
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(PlaceSummaryComponent);
    component = fixture.componentInstance;
    component.place = { id: 'pl1', name: 'Test Place', description: '', parts: [] } as any;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
