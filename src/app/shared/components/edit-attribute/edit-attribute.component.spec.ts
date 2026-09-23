import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { EditAttributeComponent } from './edit-attribute.component';
import { createComponentTestProviders } from '../../../testing/supabase-test-helpers';

describe('EditAttributeComponent', () => {
  let component: EditAttributeComponent;
  let fixture: ComponentFixture<EditAttributeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EditAttributeComponent],
      providers: createComponentTestProviders(),
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(EditAttributeComponent);
    component = fixture.componentInstance;
    component.props = { personId: 'p1', attributeKey: 'courage' } as any;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
