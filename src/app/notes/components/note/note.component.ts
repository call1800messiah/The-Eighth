import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { faBars } from '@fortawesome/free-solid-svg-icons';
import { Subscription } from 'rxjs';
import { map } from 'rxjs/operators';

import type { Note } from '../../models/note';
import type { Menu } from '../../../shared';
import { NotesService } from '../../services/notes.service';
import { PopoverService } from '../../../core/services/popover.service';
import { EditNoteComponent } from '../edit-note/edit-note.component';

@Component({
  selector: 'app-note',
  templateUrl: './note.component.html',
  styleUrls: ['./note.component.scss']
})
export class NoteComponent implements OnInit, OnDestroy {
  @Input() entityId?: string; // Optional input for embedded usage
  @Input() noteId?: string; // Alias for entityId
  note: Note;
  private noteSub: Subscription;

  constructor(
    private notesService: NotesService,
    private popover: PopoverService,
  ) {}

  ngOnInit(): void {
    // Support both entityId and noteId for backwards compatibility
    const id = this.entityId || this.noteId;

    if (!id) {
      console.error('NoteComponent: No note ID provided');
      return;
    }

    this.noteSub = this.notesService.getNotes().pipe(
      map(notes => notes.find(n => n.id === id))
    ).subscribe((note) => {
      if (note) {
        this.note = note;
      }
    });
  }

  ngOnDestroy(): void {
    if (this.noteSub) {
      this.noteSub.unsubscribe();
    }
  }

  editNote(): void {
    this.popover.showPopover('Notiz bearbeiten', EditNoteComponent, this.note);
  }
}
