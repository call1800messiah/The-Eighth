import { Injectable } from '@angular/core';
import { BehaviorSubject, mergeMap, Observable } from 'rxjs';
import { debounceTime, map, tap } from 'rxjs/operators';

import type { Timeline } from '../models/timeline';
import type { HistoricEvent } from '../models/historic-event';
import { ApiService } from '../../core/services/api.service';
import { UtilService } from '../../core/services/util.service';
import { AuthUser } from '../../auth/models/auth-user';
import { AuthService } from '../../core/services/auth.service';



@Injectable({
  providedIn: 'root'
})
export class TimelineService {
  static readonly collection = 'timelines';
  private user: AuthUser;
  private pageSize = 10;
  private readonly timelineEvents: Record<string, Observable<HistoricEvent[]>>
  private readonly timelineLimit: Record<string, BehaviorSubject<number>>;
  private readonly timelineTotal: Record<string, number>;

  constructor(
    private api: ApiService,
    private auth: AuthService,
  ) {
    this.user = this.auth.user;
    this.timelineEvents = {};
    this.timelineLimit = {};
    this.timelineTotal = {};
  }



  getEvents(timelineId: string): Observable<HistoricEvent[]> {
    if (!this.timelineEvents[timelineId]) {
      const eventCollection = `${TimelineService.collection}/${timelineId}/events`;
      this.timelineLimit[timelineId] = new BehaviorSubject<number>(this.pageSize);
      this.timelineTotal[timelineId] = 0;
      this.timelineEvents[timelineId] = this.timelineLimit[timelineId].pipe(
        debounceTime(300),
        mergeMap((limit) => this.api.getDataFromCollection(
          eventCollection,
          (ref) => ref
            .where('access', 'array-contains', this.user.id)
            .limit(limit)
            .orderBy('created', 'desc')
        )),
        map((events) => this.transformEvents(events, eventCollection)),
        tap((events) => this.timelineTotal[timelineId] = events.length),
      );
    }
    return this.timelineEvents[timelineId];
  }


  getTimeline(id: string): Observable<Timeline> {
    return this.api.getItemFromCollection(`${TimelineService.collection}/${id}`).pipe(
      map((timeline) => this.transformTimeline(timeline)),
    );
  }


  loadMoreEvents(timelineId: string) {
    const limit = this.timelineLimit[timelineId].value;
    if (limit < this.timelineTotal[timelineId] + this.pageSize) {
      this.timelineLimit[timelineId].next(limit + this.pageSize);
    }
  }



  private transformEvents(events: any[], collection: string): HistoricEvent[] {
    return events.reduce((all: HistoricEvent[], event, index) => {
      const eventData = event.payload.doc.data();
      const loadedEvent = {
        access: eventData.access,
        collection,
        content: eventData.content,
        created: eventData.created ? new Date(eventData.created.seconds * 1000) : null,
        date: eventData.date,
        id: event.payload.doc.id,
        modified: eventData.modified ? new Date(eventData.modified.seconds * 1000) : null,
        owner: eventData.owner ? eventData.owner : null,
        type: eventData.type,
      }
      all.push(loadedEvent);

      return all;
    }, []).sort(UtilService.orderByCreated);
  }


  private transformTimeline(data: any): Timeline {
    return {
      id: data.payload.id,
      name: data.payload.data()?.name,
      events: this.getEvents(data.payload.id),
    };
  }
}
