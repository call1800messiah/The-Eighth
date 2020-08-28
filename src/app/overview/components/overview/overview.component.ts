import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';

import { DataService } from '../../../core/services/data.service';
import { CampaignData } from '../../../core/interfaces/campaign-data.interface';
import { Timeline } from '../../../core/interfaces/timeline.interface';



@Component({
  selector: 'app-overview',
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.scss']
})
export class OverviewComponent implements OnInit {
  campaignInfo$: Observable<CampaignData>;
  timeline$: Observable<Timeline>;

  constructor(
    private data: DataService,
  ) {
    this.campaignInfo$ = this.data.getCampaignInfo();
    this.timeline$ = this.data.getTimeline('vbxJs3tgWLUJv2UZMPh4');
  }

  ngOnInit(): void {
  }

}
