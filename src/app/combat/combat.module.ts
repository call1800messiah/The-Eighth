import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { OverviewComponent } from './components/overview/overview.component';
import { CombatRoutingModule } from './combat-routing.module';
import { SharedModule } from '../shared/shared.module';
import { AddPersonAsCombatantComponent } from './components/add-person-as-combatant/add-person-as-combatant.component';
import { EditInitiativeComponent } from './components/edit-initiative/edit-initiative.component';
import { CombatantMenuComponent } from './components/combatant-menu/combatant-menu.component';
import { CombatantComponent } from './components/combatant/combatant.component';
import { EditStatesComponent } from './components/edit-states/edit-states.component';
import { ListEnemiesComponent } from './components/list-enemies/list-enemies.component';
import { EditEnemyComponent } from './components/edit-enemy/edit-enemy.component';



@NgModule({
  declarations: [
    AddPersonAsCombatantComponent,
    CombatantComponent,
    CombatantMenuComponent,
    EditEnemyComponent,
    EditInitiativeComponent,
    EditStatesComponent,
    ListEnemiesComponent,
    OverviewComponent,
  ],
  imports: [
    CombatRoutingModule,
    CommonModule,
    SharedModule,
  ]
})
export class CombatModule { }
