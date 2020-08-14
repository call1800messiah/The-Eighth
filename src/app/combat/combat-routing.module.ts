import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AuthGuardService } from '../core/services/auth-guard.service';
import { OverviewComponent } from './components/overview/overview.component';



const routes: Routes = [{
  canActivateChild: [AuthGuardService],
  path: '',
  component: OverviewComponent,
  children: []
}];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CombatRoutingModule { }
