import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PlaceListComponent } from './components/place-list/place-list.component';
import { PlaceComponent } from './components/place/place.component';
import { PlacesRoutingModule } from './places-routing.module';
import { SharedModule } from '../shared/shared.module';
import { EditPlaceComponent } from './components/edit-place/edit-place.component';
import { PlaceSummaryComponent } from './components/place-summary/place-summary.component';



@NgModule({
  declarations: [
    PlaceListComponent,
    PlaceComponent,
    EditPlaceComponent,
    PlaceSummaryComponent,
  ],
  imports: [
    CommonModule,
    SharedModule,
    PlacesRoutingModule,
  ],
  exports: [
    PlaceComponent
  ]
})
export class PlacesModule { }
