import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuestListComponent } from './components/quest-list/quest-list.component';
import { QuestComponent } from './components/quest/quest.component';
import { QuestsRoutingModule } from './quests-routing.module';
import { EditQuestComponent } from './components/edit-quest/edit-quest.component';



@NgModule({
  declarations: [
    QuestListComponent,
    QuestComponent,
    EditQuestComponent
  ],
  imports: [
    CommonModule,
    QuestsRoutingModule
  ]
})
export class QuestsModule { }
