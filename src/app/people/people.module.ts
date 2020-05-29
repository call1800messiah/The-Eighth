import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ListComponent } from './components/list/list.component';
import { PeopleRoutingModule } from './people-routing.module';
import { PersonInfoComponent } from './components/person-info/person-info.component';
import {SharedModule} from '../shared/shared.module';



@NgModule({
  declarations: [
    ListComponent,
    PersonInfoComponent,
  ],
    imports: [
        CommonModule,
        PeopleRoutingModule,
        SharedModule,
    ]
})
export class PeopleModule { }
