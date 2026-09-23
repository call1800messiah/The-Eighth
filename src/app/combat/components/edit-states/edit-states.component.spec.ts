import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { EditStatesComponent } from './edit-states.component';
import { createComponentTestProviders } from '../../../testing/supabase-test-helpers';

describe('EditStatesComponent', () => {
  let component: EditStatesComponent;
  let fixture: ComponentFixture<EditStatesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EditStatesComponent],
      providers: createComponentTestProviders(),
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(EditStatesComponent);
    component = fixture.componentInstance;
    component.props = { combatantId: 'c1' } as any;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
