import { Component } from '@angular/core';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import type { AddableRule } from '../../models';
import { RulesService } from '../../services/rules.service';
import { PopoverService } from '../../../core/services/popover.service';
import { EditRuleComponent } from '../edit-rule/edit-rule.component';



@Component({
  selector: 'app-rules-list',
  templateUrl: './rules-list.component.html',
  styleUrl: './rules-list.component.scss'
})
export class RulesListComponent {
  faPlus = faPlus;
  filteredRules$: Observable<Record<string,AddableRule[]>>;
  filterText$: BehaviorSubject<string>;
  initialFilterText: string;
  ruleTypes = RulesService.ruleTypes;

  constructor(
    private popover: PopoverService,
    private rulesService: RulesService
  ) {
    this.initialFilterText = localStorage.getItem('rules-filter') || '';
    this.filterText$ = new BehaviorSubject<string>(this.initialFilterText);
    this.filteredRules$ = combineLatest([
      this.rulesService.getDynamicRules(),
      this.filterText$
    ]).pipe(
      map(this.filterRulesByText),
      map(this.groupByTypeAndCategory)
    );
  }


  editRule(rule: AddableRule) {
    this.popover.showPopover('Regel bearbeiten', EditRuleComponent, rule);
  }


  onFilterChanged(text: string) {
    localStorage.setItem('rules-filter', text);
    this.filterText$.next(text);
  }


  showAddDialog() {
    this.popover.showPopover('Neue Regel', EditRuleComponent);
  }


  private filterRulesByText([rules, text]: [AddableRule[], string]): AddableRule[] {
    const lowerCaseText = text.toLowerCase();
    return rules.filter((rule) => {
      return text === '' || rule.name.toLowerCase().includes(lowerCaseText)
        || RulesService.ruleTypes[rule.type].label.toLowerCase().includes(lowerCaseText);
    });
  }


  private groupByTypeAndCategory(rules: AddableRule[]): Record<string, AddableRule[]> {
    return rules.reduce((acc, rule) => {
      const key = rule.type;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(rule);
      return acc;
    }, {});
  }
}
