import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { OverviewComponent } from './components/overview/overview.component';
import { CombatRoutingModule } from './combat-routing.module';
import { SharedModule } from '../shared/shared.module';
import { EditInitiativeComponent } from './components/edit-initiative/edit-initiative.component';
import { CombatantMenuComponent } from './components/combatant-menu/combatant-menu.component';
import { CombatantComponent } from './components/combatant/combatant.component';
import { EditStatesComponent } from './components/edit-states/edit-states.component';



@NgModule({
  declarations: [
    OverviewComponent,
    EditInitiativeComponent,
    CombatantMenuComponent,
    CombatantComponent,
    EditStatesComponent
  ],
  imports: [
    CommonModule,
    CombatRoutingModule,
    SharedModule,
  ]
})
export class CombatModule { }
