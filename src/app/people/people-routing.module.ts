import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ListComponent } from './components/list/list.component';
import { AuthGuardService } from '../core/services/auth-guard.service';
import { PersonComponent } from './components/person/person.component';
import { PeopleDashboardComponent } from './components/people-dashboard/people-dashboard.component';



const routes: Routes = [{
  canActivateChild: [AuthGuardService],
  path: '',
  component: PeopleDashboardComponent,
  children: [
    {
      path: ':id',
      component: PersonComponent,
    },
    {
      path: '',
      component: ListComponent,
    }
  ]
}];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PeopleRoutingModule { }
