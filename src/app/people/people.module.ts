import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ListComponent } from './components/list/list.component';
import { PeopleRoutingModule } from './people-routing.module';



@NgModule({
  declarations: [
    ListComponent,
  ],
  imports: [
    CommonModule,
    PeopleRoutingModule,
  ]
})
export class PeopleModule { }
