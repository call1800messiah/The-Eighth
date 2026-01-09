import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuestListComponent } from './components/quest-list/quest-list.component';
import { QuestComponent } from './components/quest/quest.component';
import { QuestsRoutingModule } from './quests-routing.module';
import { EditQuestComponent } from './components/edit-quest/edit-quest.component';
import { SharedModule } from '../shared/shared.module';
import { QuestSummaryComponent } from './components/quest-summary/quest-summary.component';



@NgModule({
  declarations: [
    QuestListComponent,
    QuestComponent,
    EditQuestComponent,
    QuestSummaryComponent
  ],
  imports: [
    CommonModule,
    SharedModule,
    QuestsRoutingModule
  ],
  exports: [
    QuestComponent
  ]
})
export class QuestsModule { }
