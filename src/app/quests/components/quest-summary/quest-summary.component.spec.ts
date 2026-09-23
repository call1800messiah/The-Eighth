import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { QuestSummaryComponent } from './quest-summary.component';
import { createComponentTestProviders } from '../../../testing/supabase-test-helpers';

describe('QuestSummaryComponent', () => {
  let component: QuestSummaryComponent;
  let fixture: ComponentFixture<QuestSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [QuestSummaryComponent],
      providers: createComponentTestProviders(),
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(QuestSummaryComponent);
    component = fixture.componentInstance;
    component.quest = { id: 'q1', name: 'Test Quest', description: '', type: 'main', completed: false, subQuests: [] } as any;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
