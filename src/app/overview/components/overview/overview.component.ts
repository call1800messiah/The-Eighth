import { Component, OnInit } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import * as GSheetReader from 'g-sheets-api';

import { CampaignData } from '../../models/campaign-data';
import { Timeline } from '../../models/timeline';
import { CampaignService } from '../../services/campaign.service';
import { TimelineService } from '../../services/timeline.service';
import { environment } from '../../../../environments/environment';



@Component({
  selector: 'app-overview',
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.scss']
})
export class OverviewComponent implements OnInit {
  campaignInfo$: Observable<CampaignData>;
  timeline$: Observable<Timeline>;
  money$: Subject<number>;

  constructor(
    private campaignService: CampaignService,
    private timelineService: TimelineService,
  ) {
    this.campaignInfo$ = this.campaignService.getCampaignInfo();
    this.timeline$ = this.timelineService.getTimeline('vbxJs3tgWLUJv2UZMPh4');
    this.money$ = new Subject<number>();
  }

  ngOnInit(): void {
    this.getMoney();
  }

  getMoney() {
    GSheetReader(
      {
        apiKey: environment.googleSheets.apiKey,
        sheetId: environment.googleSheets.financeSheet,
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
    );
  }
}
