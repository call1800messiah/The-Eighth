import { Component, OnInit } from '@angular/core';
import {Observable} from 'rxjs';
import {DataService} from '../../../core/services/data.service';

@Component({
  selector: 'app-overview',
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.scss']
})
export class OverviewComponent implements OnInit {
  campaignInfo$: Observable<any>;

  constructor(
    private data: DataService,
  ) {
    this.campaignInfo$ = this.data.getCampaignInfo();
  }

  ngOnInit(): void {
  }

}
