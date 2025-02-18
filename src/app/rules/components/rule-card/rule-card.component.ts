import { Component, Input } from '@angular/core';
import type { AddableRule } from '../../models';

@Component({
  selector: 'app-rule-card',
  templateUrl: './rule-card.component.html',
  styleUrl: './rule-card.component.scss'
})
export class RuleCardComponent {
  @Input() rule: AddableRule;
}
