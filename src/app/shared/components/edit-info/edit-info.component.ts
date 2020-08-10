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
    if (this.data.info) {
      const info = this.data.info as Info;
      this.infoForm.patchValue(info);
    }
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
    } else {
      info.created = new Date();
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
