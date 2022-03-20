import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ListComponent } from './components/list/list.component';
import { AchievementsRoutingModule } from './achievements-routing.module';
import { AchievementComponent } from './components/achievement/achievement.component';
import { SharedModule } from '../shared/shared.module';
import { EditAchievementComponent } from './components/edit-achievement/edit-achievement.component';


@NgModule({
  declarations: [
    ListComponent,
    AchievementComponent,
    EditAchievementComponent,
  ],
  imports: [
    CommonModule,
    SharedModule,
    AchievementsRoutingModule,
  ]
})
export class AchievementsModule { }
