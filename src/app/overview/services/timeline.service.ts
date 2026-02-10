import { Injectable } from '@angular/core';
import { BehaviorSubject, mergeMap, Observable } from 'rxjs';
import { debounceTime, map, tap } from 'rxjs/operators';

import type { Timeline } from '../models/timeline';
import type { HistoricEvent } from '../models/historic-event';
import { UtilService } from '../../core/services/util.service';
import { DataService } from '../../core/services/data.service';
import { RealtimeService } from '../../core/services/supabase-realtime.service';



@Injectable({
  providedIn: 'root'
})
export class TimelineService {
  static readonly collection = 'timelines';
  static readonly eventsCollection = 'historic_events';
  private pageSize = 10;
  private readonly timelineEvents: Record<string, Observable<HistoricEvent[]>>
  private readonly timelineLimit: Record<string, BehaviorSubject<number>>;
  private readonly timelineTotal: Record<string, number>;

  constructor(
    private data: DataService,
    private realtime: RealtimeService,
  ) {
    this.timelineEvents = {};
    this.timelineLimit = {};
    this.timelineTotal = {};
  }



  getEvents(timelineId: string): Observable<HistoricEvent[]> {
    if (!this.timelineEvents[timelineId]) {
      this.timelineLimit[timelineId] = new BehaviorSubject<number>(this.pageSize);
      this.timelineTotal[timelineId] = 0;
      this.timelineEvents[timelineId] = this.timelineLimit[timelineId].pipe(
        debounceTime(300),
        mergeMap((limit) => this.realtime.watch<any>(
          'historic_events',
          query => query
            .select('*')
            .eq('timeline_id', timelineId)
            .order('created_at', { ascending: false })
            .limit(limit),
          `historic_events:${timelineId}:${limit}`,
        )),
        map((rows) => this.transformEvents(rows)),
        tap((events) => this.timelineTotal[timelineId] = events.length),
      );
    }
    return this.timelineEvents[timelineId];
  }


  getTimeline(id: string): Observable<Timeline> {
    return this.realtime.watchOne<any>('timelines', id).pipe(
      map((row) => ({
        id: row.id,
        name: row.name,
        events: this.getEvents(row.id),
      })),
    );
  }


  loadMoreEvents(timelineId: string) {
    const limit = this.timelineLimit[timelineId].value;
    if (limit < this.timelineTotal[timelineId] + this.pageSize) {
      this.timelineLimit[timelineId].next(limit + this.pageSize);
    }
  }


  store(event: Partial<HistoricEvent>, eventId?: string) {
    return this.data.store(event, TimelineService.eventsCollection, eventId);
  }



  private transformEvents(rows: any[]): HistoricEvent[] {
    return rows.map(row => ({
      access: [],
      collection: TimelineService.eventsCollection,
      content: row.content,
      created: row.created_at ? new Date(row.created_at) : null,
      date: row.date,
      id: row.id,
      modified: row.modified_at ? new Date(row.modified_at) : null,
      owner: row.owner_id,
      type: row.type,
    })).sort(UtilService.orderByCreated);
  }
}
