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
import { StatsComponent } from './components/stats/stats.component';
import { PersonSelectorComponent } from './components/person-selector/person-selector.component';
import { RulesModule } from '../rules/rules.module';



@NgModule({
  declarations: [
    AttributesComponent,
    CapabilityListComponent,
    EditCapabilityComponent,
    EditPersonComponent,
    ListComponent,
    PersonComponent,
    PersonSelectorComponent,
    PersonSummaryComponent,
    StatsComponent,
  ],
  imports: [
    CommonModule,
    PeopleRoutingModule,
    SharedModule,
    RulesModule,
  ],
  exports: [
    EditPersonComponent,
    PersonComponent,
    PersonSelectorComponent,
    StatsComponent,
  ]
})
export class PeopleModule { }
