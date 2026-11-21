import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { QuestComponent } from './quest.component';
import { createComponentTestProviders } from '../../../testing/supabase-test-helpers';

describe('QuestComponent', () => {
  let component: QuestComponent;
  let fixture: ComponentFixture<QuestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [QuestComponent],
      providers: createComponentTestProviders(),
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(QuestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
