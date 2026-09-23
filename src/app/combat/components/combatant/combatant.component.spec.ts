import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { CombatantComponent } from './combatant.component';
import { createComponentTestProviders } from '../../../testing/supabase-test-helpers';

describe('CombatantComponent', () => {
  let component: CombatantComponent;
  let fixture: ComponentFixture<CombatantComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CombatantComponent],
      providers: createComponentTestProviders(),
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(CombatantComponent);
    component = fixture.componentInstance;
    component.combatant = { id: 'c1', name: 'Test', initiative: 10, states: [] } as any;
    component.showAsList = false;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
