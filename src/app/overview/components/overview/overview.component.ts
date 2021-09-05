import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';

import { CampaignData } from '../../../core/interfaces/campaign-data.interface';
import { Timeline } from '../../../core/interfaces/timeline.interface';
import { CampaignService } from '../../services/campaign.service';
import { TimelineService } from '../../services/timeline.service';



@Component({
  selector: 'app-overview',
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.scss']
})
export class OverviewComponent implements OnInit {
  campaignInfo$: Observable<CampaignData>;
  timeline$: Observable<Timeline>;

  constructor(
    private campaignService: CampaignService,
    private timelineService: TimelineService,
  ) {
    this.campaignInfo$ = this.campaignService.getCampaignInfo();
    this.timeline$ = this.timelineService.getTimeline('vbxJs3tgWLUJv2UZMPh4');
  }

  ngOnInit(): void {
  }

}
