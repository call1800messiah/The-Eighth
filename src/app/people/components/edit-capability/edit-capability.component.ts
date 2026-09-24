import { Component, EventEmitter, Input, OnInit, Output, ChangeDetectionStrategy, inject } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';

import type { PopoverChild } from '../../../shared';
import type { EditCapabilityProps } from '../../models';
import type { AddableRule } from '../../../rules';
import { RulesService } from '../../../rules/services/rules.service';
import { PeopleService } from '../../services/people.service';



@Component({
  selector: 'app-edit-capability',
  templateUrl: './edit-capability.component.html',
  styleUrl: './edit-capability.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class EditCapabilityComponent implements OnInit, PopoverChild {
  private peopleService = inject(PeopleService);
  private rulesService = inject(RulesService);

  @Input() props: EditCapabilityProps;
  @Output() dismissPopover = new EventEmitter<boolean>();
  addableRuleTypes: Record<string, Record<string, string>>;
  capabilityForm = new UntypedFormGroup({
    rule: new UntypedFormControl(''),
    type: new UntypedFormControl(''),
  });
  deleteDisabled = true;
  filteredRules$: Observable<AddableRule[]>;
  ruleTypes = RulesService.ruleTypes;
  selectedType$ = new BehaviorSubject<string>('');
  selectedRule: AddableRule;

  constructor() {
    this.rulesService.getRulesConfig().then((rulesConfig) => {
      this.addableRuleTypes = rulesConfig.addableRuleTypes;
    });

    this.filteredRules$ = combineLatest([
      this.rulesService.getDynamicRules(),
      this.selectedType$,
    ]).pipe(
      map(([rules, type]) => rules.filter(rule => {
        if (!this.props.person[`${type}s`]) {
          return (type === '' || rule.type === type);
        }

        return (type === '' || rule.type === type)
          && (this.props.person[`${type}s`]?.findIndex((capability) => capability.id === rule.id) === -1 || rule.id === this.props.capability?.id);
      })),
    );
  }

  ngOnInit(): void {
    if (this.props.type) {
      this.capabilityForm.patchValue({ type: this.props.type });
      this.onTypeChanged();
      this.capabilityForm.get('type').disable();
    }
    if (this.props.capability) {
      this.capabilityForm.patchValue({ rule: this.props.capability.id });
      this.onRuleChanged();
      this.capabilityForm.get('rule').disable();
    }
  }



  delete() {
    const type = this.capabilityForm.get('type').value;

    this.peopleService.deleteCapability(
      this.props.person.id,
      type,
      this.props.capability.id,
    ).then(() => {
      this.dismissPopover.emit(true);
    });
  }


  onTypeChanged(): void {
    this.selectedType$.next(this.capabilityForm.value.type);
  }


  onRuleChanged() {
    this.filteredRules$.pipe(take(1)).subscribe((rules) => {
      this.selectedRule = rules.find(rule => rule.id === this.capabilityForm.value.rule);
      if (!this.selectedRule) {
        return;
      }

      this.updateFormControls();
    })
  }


  save(): void {
    let value: number | Record<string, string>;
    switch(this.selectedRule.type) {
      case 'skill':
      case 'spell':
      case 'liturgy':
        value = this.capabilityForm.value.value;
        break;
      case 'advantage':
      case 'disadvantage':
      case 'feat':
        value = {};
        if (this.capabilityForm.value.details) {
          value['details'] = this.capabilityForm.value.details;
        }
        if (this.capabilityForm.value.level) {
          value['level'] = this.capabilityForm.value.level;
        }
        break;
      case 'cantrip':
        value = 0;
        break;
    }

    this.peopleService.storeCapability(
      this.props.person.id,
      this.selectedRule.type,
      this.selectedRule.id,
      value,
    ).then(() => {
      this.dismissPopover.emit(true);
    });
  }


  toggleDelete() {
    this.deleteDisabled = !this.deleteDisabled;
  }



  private updateFormControls(): void {
    Object.keys(this.capabilityForm.controls).forEach((controlName) => {
      if (!['rule', 'type'].includes(controlName)) {
        this.capabilityForm.removeControl(controlName);
      }
    });

    if (this.selectedRule.type === 'skill' || this.selectedRule.type === 'spell' || this.selectedRule.type === 'liturgy') {
      this.capabilityForm.addControl('value', new UntypedFormControl(0));
    }

    if (
      (this.selectedRule.type === 'advantage' || this.selectedRule.type === 'disadvantage' || this.selectedRule.type === 'feat')
      && this.selectedRule.requiresDetails
    ) {
      this.capabilityForm.addControl('details', new UntypedFormControl(''));
    }

    if (
      (this.selectedRule.type === 'advantage' || this.selectedRule.type === 'disadvantage' || this.selectedRule.type === 'feat')
      && this.selectedRule.hasLevels
    ) {
      this.capabilityForm.addControl('level', new UntypedFormControl(''));
    }
    if (this.props.capability) {
      this.capabilityForm.patchValue(this.props.capability);
    }
  }
}
