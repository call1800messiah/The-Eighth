import { Component, ChangeDetectionStrategy, DestroyRef, ElementRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { delay, filter, map, take } from 'rxjs/operators';
import { faPlus } from '@fortawesome/free-solid-svg-icons';

import type { Note } from '../../models/note';
import { NotesService } from '../../services/notes.service';
import { PopoverService } from '../../../core/services/popover.service';
import { EditNoteComponent } from '../edit-note/edit-note.component';



@Component({
  selector: 'app-list-notes',
  templateUrl: './list-notes.component.html',
  styleUrl: './list-notes.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class ListNotesComponent {
  private destroyRef = inject(DestroyRef);
  private element = inject<ElementRef<HTMLElement>>(ElementRef);
  private noteService = inject(NotesService);
  private popover = inject(PopoverService);
  private route = inject(ActivatedRoute);

  faPlus = faPlus;
  /** Note a mention link pointed at (`/notes?note=<id>`). */
  highlightedNoteId: string | null = null;
  filteredNotes$: Observable<Record<string, Note[]>>;
  filterText$: BehaviorSubject<string>;
  initialFilterText: string;

  constructor() {
    this.initialFilterText = localStorage.getItem('notes-filter') || '';
    this.filterText$ = new BehaviorSubject<string>(this.initialFilterText);
    this.filteredNotes$ = combineLatest([
      this.noteService.getNotes(),
      this.filterText$,
    ]).pipe(
      map(this.filterNotesByText),
      map(this.groupByCategory)
    );

    this.route.queryParamMap.pipe(
      map(params => params.get('note')),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(noteId => this.highlightNote(noteId));
  }


  editNote(note: Note) {
    this.popover.showPopover('Notiz bearbeiten', EditNoteComponent, note);
  }


  /**
   * Notes have no page of their own, so a mention of one lands here. The
   * stored filter could hide it, so it is cleared for this visit.
   */
  private highlightNote(noteId: string | null) {
    this.highlightedNoteId = noteId;
    if (!noteId) {
      return;
    }
    this.initialFilterText = '';
    this.filterText$.next('');
    this.filteredNotes$.pipe(
      filter(groups => Object.values(groups).some(notes => notes.some(note => note.id === noteId))),
      take(1),
      delay(0),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => {
      this.element.nativeElement.querySelector(`[data-note-id="${CSS.escape(noteId)}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }


  onFilterChanged(text: string) {
    localStorage.setItem('notes-filter', text);
    this.filterText$.next(text);
  }


  showAddDialog() {
    this.popover.showPopover('Neue Notiz', EditNoteComponent);
  }



  private filterNotesByText([notes, text]: [Note[], string]): Note[] {
    const lowerCaseText = text.toLowerCase();
    return notes.filter((note) => {
      return text === ''
        || note.title?.toLowerCase().indexOf(lowerCaseText) !== -1
        || note.category?.toLowerCase().indexOf(lowerCaseText) !== -1
        || note.content.toLowerCase().indexOf(lowerCaseText) !== -1
    });
  }


  private groupByCategory(notes: Note[]): Record<string, Note[]> {
    const categories = {
      'Allgemein': [],
    };

    notes.forEach((note) => {
      if (note.category) {
        if (!categories[note.category]) {
          categories[note.category] = [];
        }
        categories[note.category].push(note);
      } else {
        categories['Allgemein'].push(note);
      }
    })

    return categories;
  }
}
