import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Timeline } from '../models/timeline';
import { map } from 'rxjs/operators';

import { ApiService } from '../../core/services/api.service';
import { HistoricEvent } from '../models/historic-event';
import { UtilService } from '../../core/services/util.service';
import { AuthUser } from '../../auth/models/auth-user';
import { AuthService } from '../../core/services/auth.service';



@Injectable({
  providedIn: 'root'
})
export class TimelineService {
  static readonly collection = 'timelines';
  private user: AuthUser;

  constructor(
    private api: ApiService,
    private auth: AuthService,
  ) {
    this.user = this.auth.user;
  }



  getEvents(timelineId: string): Observable<HistoricEvent[]> {
    return this.api.getDataFromCollection(
      `${TimelineService.collection}/${timelineId}/events`,
      (ref) => ref
        .where('access', 'array-contains', this.user.id)
    ).pipe(
      map((events) => this.transformEvents(events)),
    );
  }


  getTimeline(id: string): Observable<Timeline> {
    return this.api.getItemFromCollection(`${TimelineService.collection}/${id}`).pipe(
      map((timeline) => this.transformTimeline(timeline)),
    );
  }



  private transformEvents(events: any[]): HistoricEvent[] {
    return events.reduce((all, event) => {
      const eventData = event.payload.doc.data();
      all.push({
        id: event.payload.doc.id,
        content: eventData.content,
        date: eventData.date,
        created: eventData.created ? new Date(eventData.created.seconds * 1000) : null,
        isPrivate: eventData.isPrivate ? eventData.isPrivate : false,
        modified: eventData.modified ? new Date(eventData.modified.seconds * 1000) : null,
        owner: eventData.owner ? eventData.owner : null,
        type: eventData.type,
      });
      return all;
    }, []).sort(UtilService.orderByCreated);
  }


  private transformTimeline(data: any): Timeline {
    return {
      id: data.payload.id,
      name: data.payload.data().name,
      events: this.getEvents(data.payload.id),
    };
  }
}
