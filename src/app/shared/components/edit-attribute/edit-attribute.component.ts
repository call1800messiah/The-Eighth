import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { faUnlock } from '@fortawesome/free-solid-svg-icons';

import { PopoverChild } from '../../../popover/interfaces/popover-child.model';
import { DataService } from '../../../core/services/data.service';
import { Attribute } from '../../../core/interfaces/attribute.interface';



@Component({
  selector: 'app-edit-attribute',
  templateUrl: './edit-attribute.component.html',
  styleUrls: ['./edit-attribute.component.scss']
})
export class EditAttributeComponent implements OnInit, PopoverChild {
  @Input() data: any;
  @Output() dismissPopover = new EventEmitter<boolean>();
  attributeForm = new FormGroup({
    current: new FormControl(0),
    max: new FormControl({ value: 0, disabled: true }),
  });
  faUnlock = faUnlock;

  constructor(
    private dataService: DataService,
  ) { }

  ngOnInit(): void {
    if (this.data.attribute) {
      const attribute = this.data.attribute as Attribute;
      this.attributeForm.patchValue(attribute);
    }
  }



  save() {
    const attribute: Attribute = Object.assign(
      { type: this.data.attribute.type },
    {...this.attributeForm.value}
    );

    console.log('Storing', attribute);
    this.dataService.store(attribute, `people/${this.data.person}/attributes`, this.data.attribute.id).then((stuff) => {
      console.log('Done');
      this.dismissPopover.emit(true);
    });
  }


  toggleMax() {
    const max = this.attributeForm.get('max');
    if (max.disabled) {
      max.enable();
    } else {
      max.disable();
    }
  }
}
