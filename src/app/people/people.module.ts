import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ListComponent } from './components/list/list.component';
import { PeopleRoutingModule } from './people-routing.module';
import { PersonInfoComponent } from './components/person-info/person-info.component';
import { SharedModule } from '../shared/shared.module';
import { EditPersonComponent } from './components/edit-person/edit-person.component';



@NgModule({
  declarations: [
    ListComponent,
    PersonInfoComponent,
    EditPersonComponent,
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
