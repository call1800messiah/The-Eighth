import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SceneRoutingModule } from './scene-routing.module';
import { SharedModule } from '../shared/shared.module';
import { SceneListComponent } from './components/scene-list/scene-list.component';
import { SceneSummaryComponent } from './components/scene-summary/scene-summary.component';
import { EditSceneComponent } from './components/edit-scene/edit-scene.component';
import { SceneComponent } from './components/scene/scene.component';



@NgModule({
  declarations: [
    SceneListComponent,
    SceneSummaryComponent,
    EditSceneComponent,
    SceneComponent
  ],
  imports: [
    CommonModule,
    SceneRoutingModule,
    SharedModule,
  ]
})
export class SceneModule { }
