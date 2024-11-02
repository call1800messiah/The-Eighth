import { Component, Input, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { faPlus } from '@fortawesome/free-solid-svg-icons';

import type { Timeline } from '../../../overview/models/timeline';
import { PopoverService } from '../../../core/services/popover.service';
import { EditEventComponent } from '../edit-event/edit-event.component';
import { TimelineService } from '../../../overview/services/timeline.service';
import { HistoricEvent } from '../../../overview/models/historic-event';



@Component({
  selector: 'app-timeline',
  templateUrl: './timeline.component.html',
  styleUrls: ['./timeline.component.scss']
})
export class TimelineComponent implements OnInit {
  @Input() timelineId: string;
  timeline$: Observable<Timeline>;
  faPlus = faPlus;

  constructor(
    private popover: PopoverService,
    private timelineService: TimelineService,
  ) {}

  ngOnInit(): void {
    this.timeline$ = this.timelineService.getTimeline(this.timelineId);
  }



  editEvent(event: HistoricEvent, timelineId: string) {
    this.popover.showPopover('Ereignis editieren', EditEventComponent, {
      event,
      parent: timelineId
    });
  }


  loadMoreEvents() {
    this.timelineService.loadMoreEvents(this.timelineId);
  }


  showAddDialog(timelineId: string) {
    this.popover.showPopover('Neues Ereignis', EditEventComponent, {
      parent: timelineId
    });
  }
}
