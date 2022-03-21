import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { QuickDiceComponent } from './components/quick-dice/quick-dice.component';
import { DieComponent } from './components/die/die.component';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { HitLocationDieComponent } from './components/hit-location-die/hit-location-die.component';



@NgModule({
  declarations: [
    DieComponent,
    HitLocationDieComponent,
    QuickDiceComponent,
  ],
  exports: [
    DieComponent,
    HitLocationDieComponent,
    QuickDiceComponent,
  ],
  imports: [
    CommonModule,
    FontAwesomeModule,
  ],
})
export class DiceModule { }
