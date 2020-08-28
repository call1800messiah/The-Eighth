import { Component, Input, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { faPlus } from '@fortawesome/free-solid-svg-icons';

import { Timeline } from '../../../core/interfaces/timeline.interface';
import { PopoverService } from '../../../popover/services/popover.service';
import { EditEventComponent } from '../edit-event/edit-event.component';



@Component({
  selector: 'app-timeline',
  templateUrl: './timeline.component.html',
  styleUrls: ['./timeline.component.scss']
})
export class TimelineComponent implements OnInit {
  @Input() timeline$: Observable<Timeline>;
  faPlus = faPlus;

  constructor(
    private popover: PopoverService,
  ) { }

  ngOnInit(): void {
  }



  editEvent(event, timelineId) {
    this.popover.showPopover('Ereignis editieren', EditEventComponent, {
      event,
      parent: timelineId
    });
  }


  showAddDialog(timelineId) {
    this.popover.showPopover('Neues Ereignis', EditEventComponent, {
      parent: timelineId
    });
  }
}
