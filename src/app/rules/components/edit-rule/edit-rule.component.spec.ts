import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { EditRuleComponent } from './edit-rule.component';
import { createComponentTestProviders } from '../../../testing/supabase-test-helpers';

describe('EditRuleComponent', () => {
  let component: EditRuleComponent;
  let fixture: ComponentFixture<EditRuleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EditRuleComponent],
      providers: createComponentTestProviders(),
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(EditRuleComponent);
    component = fixture.componentInstance;
    component.props = {} as any;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
