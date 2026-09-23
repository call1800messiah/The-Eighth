import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { CombatantMenuComponent } from './combatant-menu.component';
import { createComponentTestProviders } from '../../../testing/supabase-test-helpers';

describe('CombatantMenuComponent', () => {
  let component: CombatantMenuComponent;
  let fixture: ComponentFixture<CombatantMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CombatantMenuComponent],
      providers: createComponentTestProviders(),
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(CombatantMenuComponent);
    component = fixture.componentInstance;
    component.props = { combatantId: 'c1' } as any;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
