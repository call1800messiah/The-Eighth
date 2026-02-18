import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { QuickDiceComponent } from './quick-dice.component';
import { createComponentTestProviders } from '../../../testing/supabase-test-helpers';

describe('QuickDiceComponent', () => {
  let component: QuickDiceComponent;
  let fixture: ComponentFixture<QuickDiceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [QuickDiceComponent],
      providers: createComponentTestProviders(),
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(QuickDiceComponent);
    component = fixture.componentInstance;
    component.amount = 1;
    component.type = 6;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
