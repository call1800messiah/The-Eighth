import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';

import { PopoverChild } from '../../../popover/models/popover-child';
import { Info } from '../../models/info';
import { DataService } from '../../../core/services/data.service';
import { ConfigService } from '../../../core/services/config.service';
import { AuthService } from '../../../core/services/auth.service';
import { EditInfoComponentProps } from '../../types/types';



@Component({
  selector: 'app-edit-info',
  templateUrl: './edit-info.component.html',
  styleUrls: ['./edit-info.component.scss']
})
export class EditInfoComponent implements OnInit, OnDestroy, PopoverChild {
  @Input() props: EditInfoComponentProps;
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
    if (this.props.info) {
      const info = this.props.info as Info;
      this.infoForm.patchValue(info);
    }
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }


  delete() {
    if (this.props.info) {
      this.dataService.delete(this.props.info.id, `${this.props.collection}/${this.props.parentId}/info`).then(() => {
        this.dismissPopover.emit(true);
      });
    }
  }


  save() {
    let id;
    const info: Info = {...this.infoForm.value};
    if (this.props.info) {
      id = this.props.info.id;
      info.owner = this.props.info.owner;
    } else {
      info.created = new Date();
      info.owner = this.userID;
    }
    info.modified = new Date();

    this.dataService.store(info, `${this.props.collection}/${this.props.parentId}/info`, id).then(() => {
      this.dismissPopover.emit(true);
    });
  }


  toggleDelete() {
    this.deleteDisabled = !this.deleteDisabled;
  }
}
