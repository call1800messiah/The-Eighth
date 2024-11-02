import { Component, OnInit } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import * as GSheetReader from 'g-sheets-api';

import type { CampaignData } from '../../models/campaign-data';
import type { Timeline } from '../../models/timeline';
import { CampaignService } from '../../services/campaign.service';
import { TimelineService } from '../../services/timeline.service';
import { environment } from '../../../../environments/environment';
import { NavigationService } from '../../../core/services/navigation.service';
import { PopoverService } from '../../../core/services/popover.service';
import { EditCampaignComponent } from '../edit-campaign/edit-campaign.component';



@Component({
  selector: 'app-overview',
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.scss']
})
export class OverviewComponent implements OnInit {
  campaignInfo: CampaignData;
  timeline$: Observable<Timeline>;
  money$: Subject<number>;

  constructor(
    private campaignService: CampaignService,
    private navService: NavigationService,
    private popover: PopoverService,
    private timelineService: TimelineService,
  ) {
    this.campaignService.getCampaignInfo().subscribe((campaignInfo) => {
      if (!campaignInfo) {
        return;
      }
      this.campaignInfo = campaignInfo;
      this.navService.setPageLabel(campaignInfo.name);
      if (campaignInfo.timelineId) {
        this.timeline$ = this.timelineService.getTimeline(campaignInfo.timelineId);
      }
    });

    this.money$ = new Subject<number>();
  }

  ngOnInit(): void {
    this.getMoney();
  }

  editCampaign(): void {
    this.popover.showPopover('Kampagne bearbeiten', EditCampaignComponent, this.campaignInfo);
  }

  getMoney() {
    if (
      !environment.tenantData[environment.tenant].googleSheets?.apiKey
      || !environment.tenantData[environment.tenant].googleSheets?.financeSheet
    ) {
      return;
    }

    GSheetReader.default(
      {
        apiKey: environment.tenantData[environment.tenant].googleSheets.apiKey,
        sheetId: environment.tenantData[environment.tenant].googleSheets.financeSheet,
        sheetName: 'Summe'
      },
      results => {
        if (results.length > 0 && results[0].Summe) {
          this.money$.next(parseFloat(results[0].Summe));
        }
      },
      error => {
        console.error(error);
        this.money$.next(0);
      }
    ).then();
  }
}
