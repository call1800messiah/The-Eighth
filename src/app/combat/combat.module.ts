import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { OverviewComponent } from './components/overview/overview.component';
import { CombatRoutingModule } from './combat-routing.module';
import { SharedModule } from '../shared/shared.module';
import { AddPersonAsCombatantComponent } from './components/add-person-as-combatant/add-person-as-combatant.component';
import { EditInitiativeComponent } from './components/edit-initiative/edit-initiative.component';



@NgModule({
  declarations: [
    OverviewComponent,
    AddPersonAsCombatantComponent,
    EditInitiativeComponent
  ],
  imports: [
    CommonModule,
    CombatRoutingModule,
    SharedModule,
  ]
})
export class CombatModule { }
