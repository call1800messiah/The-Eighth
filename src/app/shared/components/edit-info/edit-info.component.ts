import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';

import { PopoverChild } from '../../../popover/interfaces/popover-child.model';
import { Info } from '../../../core/models/info.model';
import { DataService } from '../../../core/services/data.service';
import { ConfigService } from '../../../core/services/config.service';
import { AuthService } from '../../../core/services/auth.service';
import { Subscription } from 'rxjs';



@Component({
  selector: 'app-edit-info',
  templateUrl: './edit-info.component.html',
  styleUrls: ['./edit-info.component.scss']
})
export class EditInfoComponent implements OnInit, OnDestroy, PopoverChild {
  @Input() data: any;
  @Output() dismissPopover = new EventEmitter<boolean>();
  deleteDisabled = true;
  infoForm = new FormGroup({
    content: new FormControl(''),
    isPrivate: new FormControl(false),
    type: new FormControl(0),
  });
  infoTypes = Object.values(ConfigService.infoTypes);
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
    if (this.data.info) {
      const info = this.data.info as Info;
      this.infoForm.patchValue(info);
    }
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }


  delete() {
    if (this.data.info) {
      this.dataService.delete(this.data.info.id, `people/${this.data.parent}/info`).then(() => {
        this.dismissPopover.emit(true);
      });
    }
  }


  save() {
    let id;
    const info: Info = {...this.infoForm.value};
    if (this.data.info) {
      id = this.data.info.id;
      info.owner = this.data.info.owner;
    } else {
      info.created = new Date();
      info.owner = this.userID;
    }
    info.modified = new Date();

    this.dataService.store(info, `people/${this.data.parent}/info`, id).then(() => {
      this.dismissPopover.emit(true);
    });
  }


  toggleDelete() {
    this.deleteDisabled = !this.deleteDisabled;
  }
}
