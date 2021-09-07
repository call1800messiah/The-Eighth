import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { CampaignData } from '../models/campaign-data';
import { ApiService } from '../../core/services/api.service';



@Injectable({
  providedIn: 'root'
})
export class CampaignService {
  static readonly collection = 'campaign';
  private campaignInfo$: Observable<CampaignData>;

  constructor(
    private api: ApiService,
  ) { }



  private static transformCampaign(campaignData: any[]): CampaignData {
    return campaignData[0].payload.doc.data() as CampaignData;
  }



  getCampaignInfo(): Observable<CampaignData> {
    if (!this.campaignInfo$) {
      this.campaignInfo$ = this.api.getDataFromCollection(CampaignService.collection).pipe(
        map(CampaignService.transformCampaign),
      );
    }
    return this.campaignInfo$;
  }
}
