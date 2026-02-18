import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { EditEventComponent } from './edit-event.component';
import { createComponentTestProviders } from '../../../testing/supabase-test-helpers';

describe('EditEventComponent', () => {
  let component: EditEventComponent;
  let fixture: ComponentFixture<EditEventComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EditEventComponent],
      providers: createComponentTestProviders(),
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(EditEventComponent);
    component = fixture.componentInstance;
    component.props = { timelineId: 't1' } as any;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
