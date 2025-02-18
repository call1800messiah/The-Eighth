import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../shared/shared.module';
import { RulesRoutingModule } from './rules-routing.module';
import { RulesListComponent } from './components/rules-list/rules-list.component';
import { EditRuleComponent } from './components/edit-rule/edit-rule.component';
import { RuleCardComponent } from './components/rule-card/rule-card.component';



@NgModule({
  declarations: [
    EditRuleComponent,
    RuleCardComponent,
    RulesListComponent,
  ],
  exports: [
    RuleCardComponent,
  ],
  imports: [
    CommonModule,
    RulesRoutingModule,
    SharedModule,
  ],
})
export class RulesModule { }
