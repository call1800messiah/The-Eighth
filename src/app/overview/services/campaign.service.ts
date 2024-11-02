import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { CampaignData } from '../models/campaign-data';
import { ApiService } from '../../core/services/api.service';
import { DataService } from '../../core/services/data.service';



@Injectable({
  providedIn: 'root'
})
export class CampaignService {
  static readonly collection = 'campaign';
  private campaignInfo$: Observable<CampaignData | null>;

  constructor(
    private api: ApiService,
    private data: DataService,
  ) { }



  private static transformCampaign(campaignData: any[]): CampaignData | null {
    if (campaignData.length < 1) {
      return null;
    }
    return {
      id: campaignData[0].payload.doc.id,
      ...campaignData[0].payload.doc.data(),
    };
  }



  getCampaignInfo(): Observable<CampaignData | null> {
    if (!this.campaignInfo$) {
      this.campaignInfo$ = this.api.getDataFromCollection(CampaignService.collection).pipe(
        map(CampaignService.transformCampaign),
      );
    }
    return this.campaignInfo$;
  }


  public store(campaign: Partial<CampaignData>, campaignId: string) {
    return this.data.store(campaign, CampaignService.collection, campaignId);
  }
}
