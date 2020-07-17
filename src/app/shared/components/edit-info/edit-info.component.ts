import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';

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


  save() {
    const info: Info = {...this.infoForm.value};
    info.parent = this.data.parent;
    if (this.data.id) {
      info.id = this.data.id;
    }
    this.dataService.store(info, 'info').then(() => {
      this.dismissPopover.emit(true);
    });
  }

}
