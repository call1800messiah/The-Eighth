import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AuthGuardService } from '../core/services/auth-guard.service';
import { DashboardComponent } from '../shared/components/dashboard/dashboard.component';
import { FlowViewComponent } from './components/flow-view/flow-view.component';
import { FlowListComponent } from './components/flow-list/flow-list.component';

const routes: Routes = [{
  canActivateChild: [AuthGuardService],
  path: '',
  component: DashboardComponent,
  children: [
    {
      path: ':id',
      component: FlowViewComponent,
    },
    {
      path: '',
      component: FlowListComponent,
    }
  ]
}];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FlowRoutingModule { }
