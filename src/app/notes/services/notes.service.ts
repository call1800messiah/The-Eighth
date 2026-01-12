import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import type { Note } from '../models/note';
import type { AuthUser } from '../../auth/models/auth-user';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { DataService } from '../../core/services/data.service';
import { UtilService } from '../../core/services/util.service';



@Injectable({
  providedIn: 'root'
})
export class NotesService {
  static readonly collection = 'notes';
  private notes$: BehaviorSubject<Note[]>;
  private user: AuthUser;

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private data: DataService,
  ) {
    this.user = this.auth.user;
  }



  getNotes(): Observable<Note[]> {
    if (!this.notes$) {
      this.notes$ = new BehaviorSubject<Note[]>([]);
      this.api.getDataFromCollection(
        NotesService.collection,
        (ref) => ref
          .where('access', 'array-contains', this.user.id)
      ).pipe(
        map(this.transformNotes),
        map((notes) => notes.sort(UtilService.orderByTitle)),
      ).subscribe((notes) => {
        this.notes$.next(notes);
      });
    }
    return this.notes$;
  }


  store(note: Partial<Note>, noteId?: string): Promise<{ success: boolean; id?: string }> {
    return this.data.store(note, NotesService.collection, noteId);
  }



  private transformNotes(notes): Note[] {
    return notes.reduce((all: Note[], note) => {
      const noteData = note.payload.doc.data()
      all.push({
        id: note.payload.doc.id,
        ...noteData,
        collection: NotesService.collection,
      });
      return all;
    }, [] as Note[]);
  }
}
