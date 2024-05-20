import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AuthGuardService } from '../core/services/auth-guard.service';
import { SceneListComponent } from './components/scene-list/scene-list.component';
import { DashboardComponent } from '../shared/components/dashboard/dashboard.component';
import { SceneComponent } from './components/scene/scene.component';



const routes: Routes = [{
  canActivateChild: [AuthGuardService],
  path: '',
  component: DashboardComponent,
  children: [
    {
      path: ':id',
      component: SceneComponent,
    },
    {
      path: '',
      component: SceneListComponent,
    }
  ]
}];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SceneRoutingModule { }
