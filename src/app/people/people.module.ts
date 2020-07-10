import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ListComponent } from './components/list/list.component';
import { PeopleRoutingModule } from './people-routing.module';
import { PersonSummaryComponent } from './components/person-summary/person-summary.component';
import { SharedModule } from '../shared/shared.module';
import { EditPersonComponent } from './components/edit-person/edit-person.component';
import { PersonComponent } from './components/person/person.component';
import { PeopleDashboardComponent } from './components/people-dashboard/people-dashboard.component';



@NgModule({
  declarations: [
    ListComponent,
    PersonSummaryComponent,
    EditPersonComponent,
    PersonComponent,
    PeopleDashboardComponent,
  ],
  imports: [
    CommonModule,
    PeopleRoutingModule,
    SharedModule,
  ],
  exports: [
    EditPersonComponent,
  ]
})
export class PeopleModule { }
