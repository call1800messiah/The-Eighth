import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { readDate, storeDate } from '../../core/calendar/date-columns';
import { CampaignData } from '../models/campaign-data';
import { DataService } from '../../core/services/data.service';
import { RealtimeService } from '../../core/services/supabase-realtime.service';



@Injectable({
  providedIn: 'root'
})
export class CampaignService {
  private data = inject(DataService);
  private realtime = inject(RealtimeService);

  static readonly collection = 'campaign';
  private campaignInfo$: Observable<CampaignData | null>;



  getCampaignInfo(): Observable<CampaignData | null> {
    if (!this.campaignInfo$) {
      this.campaignInfo$ = this.realtime.watch<any>(
        'campaign',
        undefined,
        'campaign',
      ).pipe(
        map(CampaignService.transformCampaign),
      );
    }
    return this.campaignInfo$;
  }


  public store(campaign: Partial<CampaignData>, campaignId: string) {
    const dbCampaign: any = { ...campaign };
    storeDate(dbCampaign, 'date');
    if (dbCampaign.staminaReduction !== undefined) {
      dbCampaign.stamina_reduction = dbCampaign.staminaReduction;
      delete dbCampaign.staminaReduction;
    }
    if (dbCampaign.timelineId !== undefined) {
      dbCampaign.timeline_id = dbCampaign.timelineId;
      delete dbCampaign.timelineId;
    }
    return this.data.store(dbCampaign, CampaignService.collection, campaignId);
  }


  private static transformCampaign(rows: any[]): CampaignData | null {
    if (rows.length < 1) {
      return null;
    }
    const row = rows[0];
    return {
      captain: row.captain,
      crewcount: row.crewcount,
      date: readDate(row.date_day, row.date_precision),
      dateLegacy: row.date_legacy ?? null,
      id: row.id,
      isPrivate: false,
      name: row.name,
      owner: row.owner_id,
      ship: row.ship,
      staminaReduction: row.stamina_reduction,
      timelineId: row.timeline_id,
      xp: row.xp,
    };
  }
}
