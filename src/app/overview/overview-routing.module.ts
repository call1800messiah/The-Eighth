import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { OverviewComponent } from './components/overview/overview.component';
import { AuthGuardService } from '../core/services/auth-guard.service';



const routes: Routes = [{
  canActivateChild: [AuthGuardService],
  path: 'overview',
  children: [
    { path: '', component: OverviewComponent },
  ]
}];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class OverviewRoutingModule { }
