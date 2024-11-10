import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ListComponent } from './components/list/list.component';
import { PeopleRoutingModule } from './people-routing.module';
import { PersonSummaryComponent } from './components/person-summary/person-summary.component';
import { SharedModule } from '../shared/shared.module';
import { EditPersonComponent } from './components/edit-person/edit-person.component';
import { PersonComponent } from './components/person/person.component';
import { AttributesComponent } from './components/attributes/attributes.component';
import { CapabilityListComponent } from './components/capability-list/capability-list.component';
import { EditCapabilityComponent } from './components/edit-capability/edit-capability.component';



@NgModule({
  declarations: [
    AttributesComponent,
    CapabilityListComponent,
    EditCapabilityComponent,
    EditPersonComponent,
    ListComponent,
    PersonComponent,
    PersonSummaryComponent,
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
