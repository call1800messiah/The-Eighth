import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import type { AddableRule } from '../../models';
import { RulesService } from '../../services/rules.service';

@Component({
  selector: 'app-rule-card',
  templateUrl: './rule-card.component.html',
  styleUrl: './rule-card.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class RuleCardComponent {
  @Input() rule: AddableRule;
  @Output() ruleClicked: EventEmitter<AddableRule> = new EventEmitter<AddableRule>();
  usageTypes = RulesService.featUsageTypes;
  ruleTypes = RulesService.ruleTypes;
}
