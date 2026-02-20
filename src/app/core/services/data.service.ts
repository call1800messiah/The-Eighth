import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ApiService } from './api.service';
import { Info } from '../../shared';
import { InfoType } from '../enums/info-type.enum';
import { AuthService } from './auth.service';
import { RealtimeService } from './supabase-realtime.service';

/** Maps DB info_type enum values to InfoType enum. */
const INFO_TYPE_MAP: Record<string, InfoType> = {
  appearance: InfoType.Appearance,
  background: InfoType.Background,
  note: InfoType.Note,
  character: InfoType.Character,
  goals: InfoType.Goals,
  reward: InfoType.Reward,
};

/** Reverse mapping: InfoType enum → DB string. */
const INFO_TYPE_TO_DB: Record<number, string> = {
  [InfoType.Appearance]: 'appearance',
  [InfoType.Background]: 'background',
  [InfoType.Note]: 'note',
  [InfoType.Character]: 'character',
  [InfoType.Goals]: 'goals',
  [InfoType.Reward]: 'reward',
};

/** Maps plural collection names to singular entity_type used in DB. */
const COLLECTION_TO_ENTITY_TYPE: Record<string, string> = {
  people: 'person',
  places: 'place',
  quests: 'quest',
};

@Injectable({
  providedIn: 'root'
})
export class DataService {

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private realtime: RealtimeService,
  ) {}



  async delete(itemId: string, collection: string): Promise<boolean> {
    const { error } = await this.api.from(collection as any)
      .delete()
      .eq('id', itemId);
    if (error) {
      console.error(error);
      return false;
    }
    return true;
  }


  getInfos(id: string, collection: string): Observable<Map<InfoType, Info[]>> {
    const entityType = COLLECTION_TO_ENTITY_TYPE[collection] || collection;
    return this.realtime.watch<any>(
      'info_boxes',
      query => query
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', id),
      `info_boxes:${entityType}:${id}`,
    ).pipe(
      map(rows => this.transformInfos(rows)),
    );
  }


  async store(item: any, collection: string, id?: string): Promise<{ success: boolean; id?: string }> {
    const storeItem = { ...item };

    // Remove Firebase-specific fields that don't exist in Supabase
    delete storeItem.access;
    delete storeItem.collection;
    delete storeItem.isPrivate;

    // Map owner → owner_id
    if (storeItem.owner && !storeItem.owner_id) {
      storeItem.owner_id = storeItem.owner;
    }
    delete storeItem.owner;

    // Set owner_id for new items
    if (!id && !storeItem.owner_id && this.auth.user) {
      storeItem.owner_id = this.auth.user.id;
    }

    if (id) {
      // Update existing
      delete storeItem.id;
      const { error } = await this.api.from(collection as any)
        .update(storeItem)
        .eq('id', id);
      if (error) {
        console.error(error);
        return { success: false };
      }
      return { success: true, id };
    } else {
      // Insert new
      delete storeItem.id;
      const { data, error } = await this.api.from(collection as any)
        .insert(storeItem)
        .select('id')
        .single() as { data: any; error: any };
      if (error) {
        console.error(error);
        return { success: false };
      }
      return { success: true, id: data?.id };
    }
  }


  async storeInfo(info: any, collection: string, parentId: string, infoId?: string): Promise<{ success: boolean; id?: string }> {
    const entityType = COLLECTION_TO_ENTITY_TYPE[collection] || collection;
    const dbType = INFO_TYPE_TO_DB[info.type] || 'note';

    if (infoId) {
      const { error } = await this.api.from('info_boxes' as any)
        .update({ content: info.content, type: dbType, modified_at: new Date().toISOString() })
        .eq('id', infoId);
      if (error) {
        console.error(error);
        return { success: false };
      }
      return { success: true, id: infoId };
    } else {
      const { data, error } = await this.api.from('info_boxes' as any)
        .insert({
          content: info.content,
          type: dbType,
          entity_type: entityType,
          entity_id: parentId,
          owner_id: info.owner || this.auth.user?.id,
        })
        .select('id')
        .single() as { data: any; error: any };
      if (error) {
        console.error(error);
        return { success: false };
      }
      return { success: true, id: data?.id };
    }
  }


  async deleteInfo(infoId: string): Promise<boolean> {
    return this.delete(infoId, 'info_boxes');
  }


  private transformInfos(rows: any[]): Map<InfoType, Info[]> {
    return rows.reduce((all: Map<InfoType, Info[]>, row: any) => {
      const infoType = INFO_TYPE_MAP[row.type] ?? InfoType.Note;
      let typeArray = all.get(infoType);
      if (!typeArray) {
        typeArray = [];
        all.set(infoType, typeArray);
      }
      typeArray.push({
        access: [],
        collection: 'info_boxes',
        content: row.content,
        created: row.created_at ? new Date(row.created_at) : null,
        id: row.id,
        modified: row.modified_at ? new Date(row.modified_at) : null,
        owner: row.owner_id,
        type: infoType,
      });
      return all;
    }, new Map<InfoType, Info[]>());
  }
}
