import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { OverviewComponent } from './components/overview/overview.component';
import { OverviewRoutingModule } from './overview-routing.module';
import { SharedModule } from '../shared/shared.module';
import { EditCampaignComponent } from './components/edit-campaign/edit-campaign.component';



@NgModule({
  declarations: [
    EditCampaignComponent,
    OverviewComponent
  ],
  imports: [
    CommonModule,
    OverviewRoutingModule,
    SharedModule,
  ],
})
export class OverviewModule { }
