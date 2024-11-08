import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';

import type { Attribute, EditAttributeProps, PopoverChild } from '../../models';
import { DataService } from '../../../core/services/data.service';
import { PeopleService } from '../../../people/services/people.service';
import { RulesService } from '../../services/rules.service';



@Component({
  selector: 'app-edit-attribute',
  templateUrl: './edit-attribute.component.html',
  styleUrls: ['./edit-attribute.component.scss']
})
export class EditAttributeComponent implements OnInit, PopoverChild {
  @Input() props: EditAttributeProps;
  @Output() dismissPopover = new EventEmitter<boolean>();
  attributeForm = new UntypedFormGroup({
    type: new UntypedFormControl('lep'),
    current: new UntypedFormControl(30),
    max: new UntypedFormControl(30),
  });
  allowedAttributes: Record<string, string>;

  constructor(
    private dataService: DataService,
    private rulesService: RulesService,
  ) {
    this.rulesService.getRules().then((rules) => {
      this.allowedAttributes = rules.allowedAttributes.reduce((acc, allowedAttribute) => {
        acc[allowedAttribute.shortCode] = allowedAttribute.name;
        return acc;
      }, {});
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
    if (this.props.altCollection) {
      this.dataService.store({ attributes: [{
        current: this.attributeForm.get('current').value,
        max: this.attributeForm.get('max').value,
        type: this.attributeForm.get('type').value,
      }] }, this.props.altCollection, this.props.personId).then(() => {
        this.dismissPopover.emit(true);
      });
    } else {
      const attribute: Attribute = {...this.attributeForm.value};
      let id: string;
      if (this.props.attribute) {
        id = this.props.attribute.id;
      }
      this.dataService.store(attribute, `${PeopleService.collection}/${this.props.personId}/attributes`, id).then(() => {
        this.dismissPopover.emit(true);
      });
    }
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
