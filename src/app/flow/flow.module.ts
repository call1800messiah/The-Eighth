import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

import { FlowRoutingModule } from './flow-routing.module';
import { SharedModule } from '../shared/shared.module';
import { QuestsModule } from '../quests/quests.module';
import { PeopleModule } from '../people/people.module';
import { PlacesModule } from '../places/places.module';
import { NotesModule } from '../notes/notes.module';

import { FlowViewComponent } from './components/flow-view/flow-view.component';
import { FlowItemComponent } from './components/flow-item/flow-item.component';
import { AddFlowItemComponent } from './components/add-flow-item/add-flow-item.component';
import { SessionMarkerComponent } from './components/session-marker/session-marker.component';

@NgModule({
  declarations: [
    FlowViewComponent,
    FlowItemComponent,
    AddFlowItemComponent,
    SessionMarkerComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    DragDropModule,
    FontAwesomeModule,
    FlowRoutingModule,
    SharedModule,
    QuestsModule,
    PeopleModule,
    PlacesModule,
    NotesModule
  ]
})
export class FlowModule { }
