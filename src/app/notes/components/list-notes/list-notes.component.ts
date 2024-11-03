import { Component } from '@angular/core';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { faPlus } from '@fortawesome/free-solid-svg-icons';

import type { Note } from '../../models/note';
import { NotesService } from '../../services/notes.service';
import { PopoverService } from '../../../core/services/popover.service';
import { EditNoteComponent } from '../edit-note/edit-note.component';



@Component({
  selector: 'app-list-notes',
  templateUrl: './list-notes.component.html',
  styleUrl: './list-notes.component.scss'
})
export class ListNotesComponent {
  faPlus = faPlus;
  filteredNotes$: Observable<Record<string, Note[]>>;
  filterText$: BehaviorSubject<string>;
  initialFilterText: string;

  constructor(
    private noteService: NotesService,
    private popover: PopoverService,
  ) {
    this.initialFilterText = localStorage.getItem('notes-filter') || '';
    this.filterText$ = new BehaviorSubject<string>(this.initialFilterText);
    this.filteredNotes$ = combineLatest([
      this.noteService.getNotes(),
      this.filterText$,
    ]).pipe(
      map(this.filterNotesByText),
      map(this.groupByCategory)
    );
  }


  editNote(note: Note) {
    this.popover.showPopover('Notiz bearbeiten', EditNoteComponent, note);
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
