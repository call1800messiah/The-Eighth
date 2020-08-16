import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';

import { DataService } from '../../../core/services/data.service';
import { CampaignData } from '../../../core/interfaces/campaign-data.interface';



@Component({
  selector: 'app-overview',
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.scss']
})
export class OverviewComponent implements OnInit {
  campaignInfo$: Observable<CampaignData>;

  constructor(
    private data: DataService,
  ) {
    this.campaignInfo$ = this.data.getCampaignInfo();
  }

  ngOnInit(): void {
  }

}
