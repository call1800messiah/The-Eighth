import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { EditInitiativeComponent } from './edit-initiative.component';
import { createComponentTestProviders } from '../../../testing/supabase-test-helpers';

describe('EditInitiativeComponent', () => {
  let component: EditInitiativeComponent;
  let fixture: ComponentFixture<EditInitiativeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EditInitiativeComponent],
      providers: createComponentTestProviders(),
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(EditInitiativeComponent);
    component = fixture.componentInstance;
    component.props = { combatantId: 'c1' } as any;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
