import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { map, switchMap, take } from 'rxjs/operators';

import type {
  EnrichedFlowItem,
  EnrichedNoteFlowItem,
  EnrichedPersonFlowItem,
  EnrichedPlaceFlowItem,
  EnrichedQuestFlowItem,
  Flow,
  FlowItem
} from '../models';
import { ApiService } from '../../core/services/api.service';
import { DataService } from '../../core/services/data.service';
import { ConfigService } from '../../core/services/config.service';
import { QuestsService } from '../../quests/services/quests.service';
import { PeopleService } from '../../people/services/people.service';
import { PlaceService } from '../../places/services/place.service';
import { NotesService } from '../../notes/services/notes.service';
import { RealtimeService } from '../../core/services/supabase-realtime.service';

@Injectable({
  providedIn: 'root'
})
export class FlowService {
  static readonly collection = 'flows';
  static readonly itemsCollection = 'flow_items';
  private flows$: BehaviorSubject<Flow[]>;

  constructor(
    private api: ApiService,
    private data: DataService,
    private realtime: RealtimeService,
    private quests: QuestsService,
    private people: PeopleService,
    private places: PlaceService,
    private notes: NotesService
  ) {}


  getFlows(): Observable<Flow[]> {
    if (!this.flows$) {
      this.flows$ = new BehaviorSubject<Flow[]>([]);
      this.realtime.watch<any>(
        'flows',
        query => query.select('*, flow_items(*)'),
        'flows',
      ).pipe(
        map(rows => rows.map(row => this.transformFlow(row)).sort((a, b) => b.date.getTime() - a.date.getTime())),
      ).subscribe(flows => {
        this.flows$.next(flows);
      });
    }
    return this.flows$;
  }


  getFlowById(id: string): Observable<Flow | null> {
    return this.getFlows().pipe(
      map(flows => flows.find(flow => flow.id === id) || null)
    );
  }


  getEnrichedFlowItems(flowId: string): Observable<EnrichedFlowItem[]> {
    return combineLatest([
      this.getFlowById(flowId),
      this.quests.getQuests(),
      this.people.getPeople(),
      this.places.getPlaces(),
      this.notes.getNotes()
    ]).pipe(
      map(([flow, quests, people, places, notes]) => {
        if (!flow || !flow.items) {
          return [];
        }

        return flow.items.map((item): EnrichedFlowItem => {
          if (item.type === 'quest') {
            const quest = quests.find(q => q.id === (item as any).questId);
            return {
              ...item,
              entity: quest || null
            } as EnrichedQuestFlowItem;
          } else if (item.type === 'person') {
            const person = people.find(p => p.id === (item as any).personId);
            return {
              ...item,
              entity: person || null
            } as EnrichedPersonFlowItem;
          } else if (item.type === 'place') {
            const place = places.find(pl => pl.id === (item as any).placeId);
            return {
              ...item,
              entity: place || null
            } as EnrichedPlaceFlowItem;
          } else if (item.type === 'note') {
            const note = notes.find(n => n.id === (item as any).noteId);
            return {
              ...item,
              entity: note || null
            } as EnrichedNoteFlowItem;
          }
          return item as EnrichedFlowItem;
        });
      })
    );
  }

  storeFlow(flow: Partial<Flow>, flowId?: string): Promise<{ success: boolean; id?: string }> {
    const cleanedFlow: any = { ...flow };
    delete cleanedFlow.items;
    return this.data.store(cleanedFlow, FlowService.collection, flowId);
  }


  async addItem(flowId: string, item: Partial<FlowItem>): Promise<boolean> {
    return this.addItems(flowId, [item]);
  }


  async addItems(flowId: string, items: Partial<FlowItem>[]): Promise<boolean> {
    return new Promise((resolve) => {
      this.getFlowById(flowId).pipe(
        take(1),
      ).subscribe(async (flow) => {
        if (!flow) {
          resolve(false);
          return;
        }

        let currentOrder = flow.items?.length || 0;
        const newRows: any[] = [];

        for (const item of items) {
          const entityId = this.getEntityId(item);
          if (!entityId) continue;

          newRows.push({
            id: ConfigService.nanoid(),
            flow_id: flowId,
            type: item.type,
            entity_id: entityId,
            sort_order: currentOrder++,
          });
        }

        if (newRows.length === 0) {
          resolve(false);
          return;
        }

        const { error } = await this.api.from('flow_items' as any).insert(newRows);
        resolve(!error);
      });
    });
  }


  async removeItem(flowId: string, itemId: string): Promise<boolean> {
    const { error } = await this.api.from('flow_items' as any)
      .delete()
      .eq('id', itemId);
    return !error;
  }


  async reorderItems(flowId: string, items: EnrichedFlowItem[]): Promise<boolean> {
    for (let i = 0; i < items.length; i++) {
      const { error } = await this.api.from('flow_items' as any)
        .update({ sort_order: i })
        .eq('id', items[i].id);
      if (error) return false;
    }
    return true;
  }


  private transformFlow(row: any): Flow {
    const flowItems: FlowItem[] = (row.flow_items || [])
      .sort((a: any, b: any) => a.sort_order - b.sort_order)
      .map((fi: any) => this.transformFlowItem(fi));

    return {
      access: [],
      collection: FlowService.collection,
      date: new Date(row.date),
      id: row.id,
      items: flowItems,
      owner: row.owner_id,
      title: row.title || '',
    };
  }


  private transformFlowItem(row: any): FlowItem {
    const base = { id: row.id, order: row.sort_order };
    switch (row.type) {
      case 'quest':
        return { ...base, type: 'quest', questId: row.entity_id };
      case 'person':
        return { ...base, type: 'person', personId: row.entity_id };
      case 'place':
        return { ...base, type: 'place', placeId: row.entity_id };
      case 'note':
        return { ...base, type: 'note', noteId: row.entity_id };
      default:
        return { ...base, type: row.type, questId: row.entity_id } as any;
    }
  }


  private getEntityId(item: Partial<FlowItem>): string | null {
    switch (item.type) {
      case 'quest': return (item as any).questId || null;
      case 'person': return (item as any).personId || null;
      case 'place': return (item as any).placeId || null;
      case 'note': return (item as any).noteId || null;
      default: return null;
    }
  }
}
