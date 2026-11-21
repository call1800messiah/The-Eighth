import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { RuleCardComponent } from './rule-card.component';
import { createComponentTestProviders } from '../../../testing/supabase-test-helpers';

describe('RuleCardComponent', () => {
  let component: RuleCardComponent;
  let fixture: ComponentFixture<RuleCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RuleCardComponent],
      providers: createComponentTestProviders(),
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(RuleCardComponent);
    component = fixture.componentInstance;
    component.rule = { id: 'r1', name: 'Test Rule', type: 'advantage', cost: '0' } as any;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
