import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { RecentRollsComponent } from './recent-rolls.component';
import { createComponentTestProviders } from '../../../testing/supabase-test-helpers';

describe('RecentRollsComponent', () => {
  let component: RecentRollsComponent;
  let fixture: ComponentFixture<RecentRollsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RecentRollsComponent],
      providers: createComponentTestProviders(),
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(RecentRollsComponent);
    component = fixture.componentInstance;
    component.amount = 5;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
