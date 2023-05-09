import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';

import { PopoverChild } from '../../models/popover-child';
import { DataService } from '../../../core/services/data.service';
import { ConfigService } from '../../../core/services/config.service';
import { AuthService } from '../../../core/services/auth.service';
import { Subscription } from 'rxjs';
import { HistoricEvent } from '../../../overview/models/historic-event';



@Component({
  selector: 'app-edit-event',
  templateUrl: './edit-event.component.html',
  styleUrls: ['./edit-event.component.scss']
})
export class EditEventComponent implements OnInit, OnDestroy, PopoverChild {
  @Input() props: any;
  @Output() dismissPopover = new EventEmitter<boolean>();
  deleteDisabled = true;
  eventForm = new UntypedFormGroup({
    content: new UntypedFormControl(''),
    date: new UntypedFormControl(''),
    type: new UntypedFormControl(0),
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
    if (this.props.event) {
      const event = this.props.event as HistoricEvent;
      this.eventForm.patchValue(event);
    }
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }


  delete() {
    if (this.props.event) {
      this.dataService.delete(this.props.event.id, `timelines/${this.props.parent}/events`).then(() => {
        this.dismissPopover.emit(true);
      });
    }
  }


  save() {
    let id;
    const event: HistoricEvent = {...this.eventForm.value};
    if (this.props.event) {
      id = this.props.event.id;
      event.owner = this.props.event.owner;
      event.isPrivate = this.props.event.isPrivate;
    } else {
      event.created = new Date();
      event.owner = this.userID;
      event.isPrivate = false;
    }
    event.modified = new Date();

    this.dataService.store(event, `timelines/${this.props.parent}/events`, id).then(() => {
      this.dismissPopover.emit(true);
    });
  }


  toggleDelete() {
    this.deleteDisabled = !this.deleteDisabled;
  }
}
