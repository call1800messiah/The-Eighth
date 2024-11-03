import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';

import type { Note } from '../../models/note';
import { PopoverChild } from '../../../shared/models/popover-child';
import { AuthService } from '../../../core/services/auth.service';
import { NotesService } from '../../services/notes.service';
import { DataService } from '../../../core/services/data.service';
import { InfoType } from '../../../core/enums/info-type.enum';


@Component({
  selector: 'app-edit-note',
  templateUrl: './edit-note.component.html',
  styleUrl: './edit-note.component.scss'
})
export class EditNoteComponent implements OnDestroy, OnInit, PopoverChild {
  @Input() props: Note;
  @Output() dismissPopover = new EventEmitter<boolean>();
  deleteDisabled = true;
  noteForm = new UntypedFormGroup({
    category: new UntypedFormControl(''),
    content: new UntypedFormControl(''),
    title: new UntypedFormControl(''),
  });
  userID: string;
  private subscription = new Subscription();

  constructor(
    private auth: AuthService,
    private dataService: DataService,
    private noteService: NotesService,
  ) {
    this.subscription.add(
      this.auth.user$.subscribe((user) => {
        this.userID = user.id;
      })
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  ngOnInit() {
    if (this.props.id) {
      this.noteForm.patchValue(this.props);
    }
  }



  delete() {
    if (this.props.id) {
      this.dataService.delete(this.props.id, NotesService.collection).then(() => {
        this.dismissPopover.emit(true);
      });
    }
  }

  save() {
    const note: Note = {
      ...this.noteForm.value,
      type: InfoType.Note,
    };
    if (this.props.id) {
      note.owner = this.props.owner;
    } else {
      note.owner = this.userID;
    }
    this.noteService.store(note, this.props.id).then(() => {
      this.dismissPopover.emit(true);
    });
  }

  toggleDelete() {
    this.deleteDisabled = !this.deleteDisabled;
  }
}
