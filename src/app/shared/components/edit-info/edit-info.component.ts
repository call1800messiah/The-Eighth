import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { faUnlock } from '@fortawesome/free-solid-svg-icons';

import { PopoverChild } from '../../../popover/interfaces/popover-child.model';
import { Info } from '../../../core/models/info.model';
import { DataService } from '../../../core/services/data.service';
import { ConfigService } from '../../../core/services/config.service';



@Component({
  selector: 'app-edit-info',
  templateUrl: './edit-info.component.html',
  styleUrls: ['./edit-info.component.scss']
})
export class EditInfoComponent implements OnInit, PopoverChild {
  @Input() data: any;
  @Output() dismissPopover = new EventEmitter<boolean>();
  deleteDisabled = true;
  faUnlock = faUnlock;
  infoForm = new FormGroup({
    content: new FormControl(''),
    type: new FormControl(0),
  });
  infoTypes = Object.values(ConfigService.infoTypes);

  constructor(
    private dataService: DataService,
  ) { }

  ngOnInit(): void {
    if (this.data.id) {
      const info = this.data as Info;
      this.infoForm.patchValue(info);
    }
  }



  delete() {
    if (this.data.id) {
      this.dataService.delete(this.data.id, 'info').then(() => {
        this.dismissPopover.emit(true);
      });
    }
  }


  save() {
    const info: Info = {...this.infoForm.value};
    if (!this.data.id) {
      info.created = new Date();
    }
    info.parent = this.data.parent;
    info.modified = new Date();

    this.dataService.store(info, 'info', this.data.id).then(() => {
      this.dismissPopover.emit(true);
    });
  }


  toggleDelete() {
    this.deleteDisabled = !this.deleteDisabled;
  }
}
