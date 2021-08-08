import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';

import { PopoverChild } from '../../../popover/interfaces/popover-child.model';
import { DataService } from '../../../core/services/data.service';
import { ConfigService } from '../../../core/services/config.service';
import { AuthService } from '../../../core/services/auth.service';
import { Subscription } from 'rxjs';
import { HistoricEvent } from '../../../core/interfaces/historic-event.interface';



@Component({
  selector: 'app-edit-event',
  templateUrl: './edit-event.component.html',
  styleUrls: ['./edit-event.component.scss']
})
export class EditEventComponent implements OnInit, OnDestroy, PopoverChild {
  @Input() data: any;
  @Output() dismissPopover = new EventEmitter<boolean>();
  deleteDisabled = true;
  eventForm = new FormGroup({
    content: new FormControl(''),
    date: new FormControl(''),
    type: new FormControl(0),
  });
  eventTypes = Object.values(ConfigService.eventTypes);
  userID: string;
  private subscription = new Subscription();

  constructor(
    private auth: AuthService,
    private dataService: DataService,
  ) {
    this.subscription.add(
      this.auth.user$.subscribe((user) => {
        this.userID = user.id;
      })
    );
  }

  ngOnInit(): void {
    if (this.data.event) {
      const event = this.data.event as HistoricEvent;
      this.eventForm.patchValue(event);
    }
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }


  delete() {
    if (this.data.event) {
      this.dataService.delete(this.data.event.id, `timelines/${this.data.parent}/events`).then(() => {
        this.dismissPopover.emit(true);
      });
    }
  }


  save() {
    let id;
    const event: HistoricEvent = {...this.eventForm.value};
    if (this.data.event) {
      id = this.data.event.id;
    } else {
      event.created = new Date();
      event.owner = this.userID;
      event.isPrivate = false;
    }
    event.modified = new Date();

    this.dataService.store(event, `timelines/${this.data.parent}/events`, id).then(() => {
      this.dismissPopover.emit(true);
    });
  }


  toggleDelete() {
    this.deleteDisabled = !this.deleteDisabled;
  }
}
