import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { EditNoteComponent } from './edit-note.component';
import { createComponentTestProviders } from '../../../testing/supabase-test-helpers';

describe('EditNoteComponent', () => {
  let component: EditNoteComponent;
  let fixture: ComponentFixture<EditNoteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EditNoteComponent],
      providers: createComponentTestProviders(),
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(EditNoteComponent);
    component = fixture.componentInstance;
    component.props = {} as any;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
