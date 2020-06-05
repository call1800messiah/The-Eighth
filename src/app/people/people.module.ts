import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ListComponent } from './components/list/list.component';
import { PeopleRoutingModule } from './people-routing.module';
import { PersonInfoComponent } from './components/person-info/person-info.component';
import { SharedModule } from '../shared/shared.module';
import { AddPersonComponent } from './components/add-person/add-person.component';



@NgModule({
  declarations: [
    ListComponent,
    PersonInfoComponent,
    AddPersonComponent,
  ],
  imports: [
      CommonModule,
      PeopleRoutingModule,
      SharedModule,
  ],
  exports: [
    AddPersonComponent,
  ]
})
export class PeopleModule { }
