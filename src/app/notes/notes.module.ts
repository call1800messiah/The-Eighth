import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../shared/shared.module';
import { NotesRoutingModule } from './notes-routing.module';
import { EditNoteComponent } from './components/edit-note/edit-note.component';
import { ListNotesComponent } from './components/list-notes/list-notes.component';



@NgModule({
  declarations: [
    EditNoteComponent,
    ListNotesComponent,
  ],
  imports: [
    CommonModule,
    NotesRoutingModule,
    SharedModule,
  ]
})
export class NotesModule { }
