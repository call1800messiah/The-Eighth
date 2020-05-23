import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ListComponent } from './components/list/list.component';
import { AchievementsRoutingModule } from './achievements-routing.module';


@NgModule({
  declarations: [
    ListComponent,
  ],
  imports: [
    CommonModule,
    AchievementsRoutingModule,
  ]
})
export class AchievementsModule { }
