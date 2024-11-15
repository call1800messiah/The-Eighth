import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../shared/shared.module';
import { RulesRoutingModule } from './rules-routing.module';
import { RulesListComponent } from './components/rules-list/rules-list.component';
import { EditRuleComponent } from './components/edit-rule/edit-rule.component';



@NgModule({
  declarations: [
    EditRuleComponent,
    RulesListComponent,
  ],
  imports: [
    CommonModule,
    RulesRoutingModule,
    SharedModule,
  ]
})
export class RulesModule { }
