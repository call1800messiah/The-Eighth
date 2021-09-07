import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';

import { PopoverChild } from '../../../popover/models/popover-child';
import { DataService } from '../../../core/services/data.service';
import { Attribute } from '../../models/attribute';
import { PeopleService } from '../../../people/services/people.service';



@Component({
  selector: 'app-edit-attribute',
  templateUrl: './edit-attribute.component.html',
  styleUrls: ['./edit-attribute.component.scss']
})
export class EditAttributeComponent implements OnInit, PopoverChild {
  @Input() props: any;
  @Output() dismissPopover = new EventEmitter<boolean>();
  attributeForm = new FormGroup({
    current: new FormControl(0),
    max: new FormControl({ value: 0, disabled: true }),
  });

  constructor(
    private dataService: DataService,
  ) { }

  ngOnInit(): void {
    if (this.props.attribute) {
      const attribute = this.props.attribute as Attribute;
      this.attributeForm.patchValue(attribute);
    }
  }



  save() {
    const attribute: Attribute = {...this.attributeForm.value};

    const collection = `${this.props.altCollection ? this.props.altCollection : PeopleService.collection}/${this.props.person}/attributes`;
    this.dataService.store(attribute, collection, this.props.attribute.id).then((stuff) => {
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
