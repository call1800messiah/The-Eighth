import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AuthGuardService } from '../core/services/auth-guard.service';
import { DashboardComponent } from '../shared/components/dashboard/dashboard.component';
import { DraftsComponent } from './components/drafts/drafts.component';

const routes: Routes = [{
  canActivateChild: [AuthGuardService],
  path: '',
  component: DashboardComponent,
  children: [
    {
      path: '',
      component: DraftsComponent,
    }
  ]
}];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DraftsRoutingModule { }
