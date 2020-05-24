import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ListComponent } from './components/list/list.component';
import { AchievementsRoutingModule } from './achievements-routing.module';
import { AchievementComponent } from './components/achievement/achievement.component';
import { SharedModule } from '../shared/shared.module';


@NgModule({
  declarations: [
    ListComponent,
    AchievementComponent,
  ],
  imports: [
    CommonModule,
    SharedModule,
    AchievementsRoutingModule,
  ]
})
export class AchievementsModule { }
