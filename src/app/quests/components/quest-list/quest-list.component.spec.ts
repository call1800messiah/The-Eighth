import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { QuestListComponent } from './quest-list.component';
import { createComponentTestProviders } from '../../../testing/supabase-test-helpers';

describe('QuestListComponent', () => {
  let component: QuestListComponent;
  let fixture: ComponentFixture<QuestListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [QuestListComponent],
      providers: createComponentTestProviders(),
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(QuestListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
