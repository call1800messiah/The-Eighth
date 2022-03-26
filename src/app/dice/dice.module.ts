import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { QuickDiceComponent } from './components/quick-dice/quick-dice.component';
import { DieComponent } from './components/die/die.component';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { HitLocationDieComponent } from './components/hit-location-die/hit-location-die.component';
import { RecentRollsComponent } from './components/recent-rolls/recent-rolls.component';
import { SharedModule } from '../shared/shared.module';



@NgModule({
  declarations: [
    DieComponent,
    HitLocationDieComponent,
    QuickDiceComponent,
    RecentRollsComponent,
  ],
  exports: [
    DieComponent,
    HitLocationDieComponent,
    QuickDiceComponent,
    RecentRollsComponent,
  ],
  imports: [
    CommonModule,
    FontAwesomeModule,
    SharedModule,
  ],
})
export class DiceModule { }
