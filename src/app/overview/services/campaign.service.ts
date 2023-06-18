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
  private campaignInfo$: Observable<CampaignData | null>;

  constructor(
    private api: ApiService,
  ) { }



  private static transformCampaign(campaignData: any[]): CampaignData | null {
    if (campaignData.length < 1) {
      return null;
    }
    return campaignData[0].payload.doc.data() as CampaignData;
  }



  getCampaignInfo(): Observable<CampaignData | null> {
    if (!this.campaignInfo$) {
      this.campaignInfo$ = this.api.getDataFromCollection(CampaignService.collection).pipe(
        map(CampaignService.transformCampaign),
      );
    }
    return this.campaignInfo$;
  }
}
