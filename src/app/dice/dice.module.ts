import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { QuickDiceComponent } from './components/quick-dice/quick-dice.component';
import { DieComponent } from './components/die/die.component';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';



@NgModule({
  declarations: [
    DieComponent,
    QuickDiceComponent
  ],
  exports: [
    DieComponent,
    QuickDiceComponent,
  ],
  imports: [
    CommonModule,
    FontAwesomeModule,
  ],
})
export class DiceModule { }
