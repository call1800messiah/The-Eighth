import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { AddPersonAsCombatantComponent } from './add-person-as-combatant.component';
import { createComponentTestProviders } from '../../../testing/supabase-test-helpers';

describe('AddPersonAsCombatantComponent', () => {
  let component: AddPersonAsCombatantComponent;
  let fixture: ComponentFixture<AddPersonAsCombatantComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AddPersonAsCombatantComponent],
      providers: createComponentTestProviders(),
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(AddPersonAsCombatantComponent);
    component = fixture.componentInstance;
    component.props = { people: [], selected: [] };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
