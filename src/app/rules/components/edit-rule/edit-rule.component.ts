import { Component, EventEmitter, Input, Output } from '@angular/core';
import type { PopoverChild } from '../../../shared';
import type { AddableRule } from '../../models';

@Component({
  selector: 'app-edit-rule',
  templateUrl: './edit-rule.component.html',
  styleUrl: './edit-rule.component.scss'
})
export class EditRuleComponent implements PopoverChild {
  @Input() props: AddableRule;
  @Output() dismissPopover = new EventEmitter<boolean>;
}
