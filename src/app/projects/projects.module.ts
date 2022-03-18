import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ProjectsRoutingModule } from './projects-routing.module';
import { SharedModule } from '../shared/shared.module';
import { ListComponent } from './components/list/list.component';
import { EditProjectComponent } from './components/edit-project/edit-project.component';
import { ProjectSummaryComponent } from './components/project-summary/project-summary.component';



@NgModule({
  declarations: [
    ListComponent,
    EditProjectComponent,
    ProjectSummaryComponent
  ],
  imports: [
    CommonModule,
    ProjectsRoutingModule,
    SharedModule,
  ]
})
export class ProjectsModule { }
