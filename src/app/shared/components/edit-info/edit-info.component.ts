import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { faUnlock } from '@fortawesome/free-solid-svg-icons';

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
  faUnlock = faUnlock;
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
    if (this.data.id) {
      const info = this.data as Info;
      this.infoForm.patchValue(info);
    }
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }


  delete() {
    if (this.data.id) {
      if (!this.data.isPrivate) {
        this.dataService.delete(this.data.id, 'info').then(() => {
          this.dismissPopover.emit(true);
        });
      } else {
        this.dataService.delete(
          this.data.id,
          `info/${ConfigService.collections.personal}/${this.userID}`,
        ).then(() => {
          this.dismissPopover.emit(true);
        });
      }
    }
  }


  save() {
    const info: Info = {...this.infoForm.value};
    if (!this.data.id) {
      info.created = new Date();
      info.owner = this.userID;
    } else if (this.data.owner) {
      info.owner = this.data.owner;
    }
    info.parent = this.data.parent;
    info.modified = new Date();

    if (info.isPrivate) {
      this.dataService.storePrivate(info, 'info', this.data.id).then(() => {
        this.dismissPopover.emit(true);
      });
    } else {
      this.dataService.store(info, 'info', this.data.id).then(() => {
        this.dismissPopover.emit(true);
      });
    }
  }


  toggleDelete() {
    this.deleteDisabled = !this.deleteDisabled;
  }
}
