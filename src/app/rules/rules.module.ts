import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../shared/shared.module';
import { RulesRoutingModule } from './rules-routing.module';
import { RulesListComponent } from './components/rules-list/rules-list.component';



@NgModule({
  declarations: [
    RulesListComponent,
  ],
  imports: [
    CommonModule,
    RulesRoutingModule,
    SharedModule,
  ]
})
export class RulesModule { }
