import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';

import { PopoverChild } from '../../models/popover-child';
import { DataService } from '../../../core/services/data.service';
import { Attribute } from '../../models/attribute';
import { PeopleService } from '../../../people/services/people.service';
import { RulesService } from '../../../core/services/rules.service';



@Component({
  selector: 'app-edit-attribute',
  templateUrl: './edit-attribute.component.html',
  styleUrls: ['./edit-attribute.component.scss']
})
export class EditAttributeComponent implements OnInit, PopoverChild {
  @Input() props: { person: string, attribute?: Attribute, altCollection?: string };
  @Output() dismissPopover = new EventEmitter<boolean>();
  attributeForm = new UntypedFormGroup({
    type: new UntypedFormControl('lep'),
    current: new UntypedFormControl(30),
    max: new UntypedFormControl(30),
  });
  types: string[] = [];

  constructor(
    private dataService: DataService,
    private rulesService: RulesService,
  ) {
    this.rulesService.getRules().then((rules) => {
      this.types = rules.barTypes;
    });
  }

  ngOnInit(): void {
    if (this.props.attribute) {
      const attribute = this.props.attribute as Attribute;
      this.attributeForm.patchValue(attribute);
      this.attributeForm.get('type').disable();
      this.attributeForm.get('max').disable();
    }
  }



  save() {
    let id: string;
    if (this.props.attribute) {
      id = this.props.attribute.id;
    }
    const attribute: Attribute = {...this.attributeForm.value};

    const collection = `${this.props.altCollection ? this.props.altCollection : PeopleService.collection}/${this.props.person}/attributes`;
    this.dataService.store(attribute, collection, id).then((stuff) => {
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
