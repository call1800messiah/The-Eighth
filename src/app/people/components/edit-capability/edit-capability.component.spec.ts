import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { EditCapabilityComponent } from './edit-capability.component';
import { createComponentTestProviders } from '../../../testing/supabase-test-helpers';

describe('EditCapabilityComponent', () => {
  let component: EditCapabilityComponent;
  let fixture: ComponentFixture<EditCapabilityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EditCapabilityComponent],
      providers: createComponentTestProviders(),
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(EditCapabilityComponent);
    component = fixture.componentInstance;
    component.props = { person: { id: 'p1', name: 'Test' } as any };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
