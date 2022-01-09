import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AuthGuardService } from '../core/services/auth-guard.service';
import { DashboardComponent } from '../shared/components/dashboard/dashboard.component';
import { QuestListComponent } from './components/quest-list/quest-list.component';
import { QuestComponent } from './components/quest/quest.component';



const routes: Routes = [{
  canActivateChild: [AuthGuardService],
  path: '',
  component: DashboardComponent,
  children: [
    {
      path: ':id',
      component: QuestComponent,
    },
    {
      path: '',
      component: QuestListComponent,
    }
  ]
}];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class QuestsRoutingModule { }
