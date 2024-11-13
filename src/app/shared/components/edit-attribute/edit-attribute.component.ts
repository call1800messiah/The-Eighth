import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { combineLatest, from, Subscription } from 'rxjs';
import { fromPromise } from 'rxjs/internal/observable/innerFrom';

import type { Attribute, EditAttributeProps, PopoverChild } from '../../models';
import { DataService } from '../../../core/services/data.service';
import { PeopleService } from '../../../people/services/people.service';
import { RulesService } from '../../../rules/services/rules.service';



@Component({
  selector: 'app-edit-attribute',
  templateUrl: './edit-attribute.component.html',
  styleUrls: ['./edit-attribute.component.scss']
})
export class EditAttributeComponent implements OnDestroy, OnInit, PopoverChild {
  @Input() props: EditAttributeProps;
  @Output() dismissPopover = new EventEmitter<boolean>();
  allowedAttributes: Record<string, string>;
  attributeForm = new UntypedFormGroup({
    type: new UntypedFormControl('lep'),
    current: new UntypedFormControl(30),
    max: new UntypedFormControl(30),
  });
  deleteDisabled = true;
  subscription = new Subscription();

  constructor(
    private dataService: DataService,
    private peopleService: PeopleService,
    private rulesService: RulesService,
  ) {}

  ngOnInit(): void {
    this.subscription.add(combineLatest([
      fromPromise(this.rulesService.getRulesConfig()),
      this.props?.filterAttributes$ ? this.props.filterAttributes$ : from([]),
    ]).subscribe(([rules, filterAttributes]) => {
      this.allowedAttributes = rules.allowedAttributes
        .filter((allowed) => !filterAttributes.includes(allowed.shortCode))
        .reduce((acc, allowedAttribute) => {
          acc[allowedAttribute.shortCode] = allowedAttribute.name;
          return acc;
        }, {});
      if (!this.allowedAttributes.lep) {
        this.attributeForm.patchValue({ type: Object.keys(this.allowedAttributes).sort()[0] });
      }
    }));

    if (this.props.attribute) {
      const attribute = this.props.attribute as Attribute;
      this.attributeForm.patchValue(attribute);
      this.attributeForm.get('type').disable();
      this.attributeForm.get('max').disable();
    }
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }


  delete() {
    if (this.props.attribute && this.props.personId) {
      this.peopleService.deleteAttribute(this.props.personId, this.props.attribute.type).then(() => {
        this.dismissPopover.emit(true);
      });
    }
  }


  save() {
    const attribute: Attribute = {
      current: this.attributeForm.get('current').value,
      max: this.attributeForm.get('max').value,
      type: this.attributeForm.get('type').value,
    };
    if (this.props.altCollection && this.props.personId) {
      this.dataService.store({ attributes: [attribute] }, this.props.altCollection, this.props.personId).then(() => {
        this.dismissPopover.emit(true);
      });
    } else {
      this.peopleService.updateAttribute(this.props.personId, attribute).then(() => {
        this.dismissPopover.emit(true);
      });
    }
  }


  toggleDelete() {
    this.deleteDisabled = !this.deleteDisabled;
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
