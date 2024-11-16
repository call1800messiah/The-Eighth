import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';

import type { PopoverChild } from '../../../shared';
import type { AddableRule } from '../../models';
import { RulesService } from '../../services/rules.service';



@Component({
  selector: 'app-edit-rule',
  templateUrl: './edit-rule.component.html',
  styleUrl: './edit-rule.component.scss'
})
export class EditRuleComponent implements OnInit, PopoverChild {
  @Input() props: AddableRule;
  @Output() dismissPopover = new EventEmitter<boolean>;
  addableRuleTypes: Record<string, Record<string, string>>;
  fieldTypeMap = {
    'string': '',
    'number': 0,
    'boolean': false,
  };
  ruleForm = new UntypedFormGroup({
    name: new UntypedFormControl(''),
    rules: new UntypedFormControl(''),
    type: new UntypedFormControl(''),
  });
  ruleTypes = RulesService.ruleTypes;


  constructor(
    private rulesService: RulesService,
  ) {
    this.rulesService.getRulesConfig().then((rulesConfig) => {
      this.addableRuleTypes = rulesConfig.addableRuleTypes;
    });
  }

  ngOnInit() {
    if (this.props.id) {
      this.onTypeChanged(this.props.type);
      this.ruleForm.patchValue(this.props);
    }
  }


  hasField(field: string): boolean {
    return !!this.addableRuleTypes[this.ruleForm.value.type]?.[field];
  }


  onTypeChanged(type?: string) {
    Object.keys(this.ruleForm.controls).forEach((controlName) => {
      if (!['name', 'rules', 'type'].includes(controlName)) {
        this.ruleForm.removeControl(controlName);
      }
    });
    Object.entries(this.addableRuleTypes[type || this.ruleForm.value.type]).forEach(([field, fieldType]) => {
      this.ruleForm.addControl(field, new UntypedFormControl(this.fieldTypeMap[fieldType]));
    });
  }


  save() {
    const rule = {
      ...this.ruleForm.value,
      name: this.ruleForm.value.name.trim(),
    }
    this.rulesService.store(rule, this.props.id).then(() => {
      this.dismissPopover.emit(true);
    });
  }
}
