import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import type { Note } from '../models/note';
import { DataService } from '../../core/services/data.service';
import { UtilService } from '../../core/services/util.service';
import { RealtimeService } from '../../core/services/supabase-realtime.service';
import { InfoType } from '../../core/enums/info-type.enum';



@Injectable({
  providedIn: 'root'
})
export class NotesService {
  static readonly collection = 'notes';
  private notes$: BehaviorSubject<Note[]>;

  constructor(
    private data: DataService,
    private realtime: RealtimeService,
  ) {}



  getNotes(): Observable<Note[]> {
    if (!this.notes$) {
      this.notes$ = new BehaviorSubject<Note[]>([]);
      this.realtime.watch<any>(
        'notes',
        undefined,
        'notes',
      ).pipe(
        map(NotesService.transformNotes),
        map(notes => notes.sort(UtilService.orderByTitle)),
      ).subscribe(notes => {
        this.notes$.next(notes);
      });
    }
    return this.notes$;
  }


  store(note: Partial<Note>, noteId?: string): Promise<{ success: boolean; id?: string }> {
    return this.data.store(note, NotesService.collection, noteId);
  }



  private static transformNotes(rows: any[]): Note[] {
    return rows.map(row => ({
      access: [],
      category: row.category,
      collection: NotesService.collection,
      content: row.content,
      created: row.created_at ? new Date(row.created_at) : null,
      id: row.id,
      modified: row.modified_at ? new Date(row.modified_at) : null,
      owner: row.owner_id,
      title: row.title,
      type: InfoType.Note,
    }));
  }
}
