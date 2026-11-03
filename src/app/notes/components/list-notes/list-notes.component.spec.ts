import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';

import { ListNotesComponent } from './list-notes.component';
import { createComponentTestProviders } from '../../../testing/supabase-test-helpers';

describe('ListNotesComponent', () => {
  let component: ListNotesComponent;
  let fixture: ComponentFixture<ListNotesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ListNotesComponent],
      providers: createComponentTestProviders(),
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(ListNotesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(component.highlightedNoteId).toBeNull();
  });
});


describe('ListNotesComponent opened from a mention', () => {
  it('highlights the note and clears the stored filter', async () => {
    localStorage.setItem('notes-filter', 'etwas');
    const providers = createComponentTestProviders().map((provider: any) =>
      provider?.provide === ActivatedRoute
        ? { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap({ note: 'n1' })) } }
        : provider
    );
    await TestBed.configureTestingModule({
      declarations: [ListNotesComponent],
      providers,
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    const fixture = TestBed.createComponent(ListNotesComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.highlightedNoteId).toBe('n1');
    expect(fixture.componentInstance.initialFilterText).toBe('');
    localStorage.removeItem('notes-filter');
  });
});
