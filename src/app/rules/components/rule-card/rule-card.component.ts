import { Component, EventEmitter, Input, Output } from '@angular/core';
import type { AddableRule } from '../../models';
import { RulesService } from '../../services/rules.service';

@Component({
  selector: 'app-rule-card',
  templateUrl: './rule-card.component.html',
  styleUrl: './rule-card.component.scss'
})
export class RuleCardComponent {
  @Input() rule: AddableRule;
  @Output() ruleClicked: EventEmitter<AddableRule> = new EventEmitter<AddableRule>();
  usageTypes = RulesService.featUsageTypes;
  ruleTypes = RulesService.ruleTypes;
}
