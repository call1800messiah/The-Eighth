import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { Timestamp } from '@angular/fire/firestore';

import type { AuthUser } from '../../auth/models/auth-user';
import type { Quest } from '../../quests/models/quest';
import type { Person } from '../../people/models/person';
import type { Place } from '../../places/models/place';
import type { Flow, FlowDB, FlowItem, EnrichedFlowItem, EnrichedQuestFlowItem, EnrichedPersonFlowItem, EnrichedPlaceFlowItem } from '../models';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { DataService } from '../../core/services/data.service';
import { ConfigService } from '../../core/services/config.service';
import { QuestsService } from '../../quests/services/quests.service';
import { PeopleService } from '../../people/services/people.service';
import { PlaceService } from '../../places/services/place.service';

@Injectable({
  providedIn: 'root'
})
export class FlowService {
  static readonly collection = 'flows';
  private flow$: BehaviorSubject<Flow | null>;
  private enrichedFlowItems$: Observable<EnrichedFlowItem[]>;
  private user: AuthUser;

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private data: DataService,
    private config: ConfigService,
    private quests: QuestsService,
    private people: PeopleService,
    private places: PlaceService
  ) {
    this.user = this.auth.user;
  }

  private static transformFlow(flowData: any, flowId: string): Flow {
    const flow: Flow = {
      id: flowId,
      campaignId: flowData.campaignId || '',
      createdBy: flowData.createdBy || '',
      createdAt: flowData.createdAt?.toDate() || new Date(),
      updatedAt: flowData.updatedAt?.toDate() || new Date(),
      access: flowData.access || [],
      items: (flowData.items || []).map((item: any) => ({
        ...item,
        date: item.date?.toDate ? item.date.toDate() : item.date
      })),
      collection: 'flows'
    };
    return flow;
  }

  /**
   * Get flow for current campaign (single campaign app)
   */
  getFlow(): Observable<Flow | null> {
    if (!this.flow$) {
      this.flow$ = new BehaviorSubject<Flow | null>(null);
      // Query for flow by user access
      this.api.getDataFromCollection(
        FlowService.collection,
        (ref) => ref
          .where('access', 'array-contains', this.user.id)
          .limit(1)
      ).pipe(
        map((flows) => {
          if (flows && flows.length > 0) {
            const flowDoc = flows[0].payload.doc;
            return FlowService.transformFlow(flowDoc.data(), flowDoc.id);
          }
          return null;
        })
      ).subscribe((flow) => {
        this.flow$.next(flow);
      });
    }
    return this.flow$;
  }

  /**
   * Get flow items enriched with entity data
   */
  getEnrichedFlowItems(): Observable<EnrichedFlowItem[]> {
    if (!this.enrichedFlowItems$) {
      this.enrichedFlowItems$ = combineLatest([
        this.getFlow(),
        this.quests.getQuests(),
        this.people.getPeople(),
        this.places.getPlaces()
      ]).pipe(
        map(([flow, quests, people, places]) => {
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
            }
            // Session markers and general notes pass through
            return item as EnrichedFlowItem;
          });
        })
      );
    }
    return this.enrichedFlowItems$;
  }

  /**
   * Create flow if it doesn't exist
   */
  createFlow(campaignId: string): Promise<boolean> {
    const flowData: FlowDB = {
      campaignId,
      createdBy: this.user.id,
      createdAt: null as any, // Firestore serverTimestamp
      updatedAt: null as any,
      access: this.data['getInitialDocumentPermissions'](this.user.id),
      items: []
    };
    return this.data.store(flowData, FlowService.collection);
  }

  /**
   * Add item to flow
   */
  async addItem(item: Partial<FlowItem>): Promise<boolean> {
    const flow = this.flow$.value;
    if (!flow) {
      // Create flow first
      await this.createFlow('default-campaign');
      // Wait for flow to be loaded
      return new Promise((resolve) => {
        setTimeout(async () => {
          const result = await this.addItem(item);
          resolve(result);
        }, 500);
      });
    }

    const newItem: FlowItem = {
      id: ConfigService.nanoid(),
      order: flow.items.length,
      ...item
    } as FlowItem;

    const updatedItems = [...flow.items, newItem];
    return this.data.store({ items: updatedItems }, FlowService.collection, flow.id);
  }

  /**
   * Remove item from flow
   */
  removeItem(itemId: string): Promise<boolean> {
    const flow = this.flow$.value;
    if (!flow) {
      return Promise.resolve(false);
    }

    const updatedItems = flow.items
      .filter(item => item.id !== itemId)
      .map((item, index) => ({ ...item, order: index }));

    return this.data.store({ items: updatedItems }, FlowService.collection, flow.id);
  }

  /**
   * Reorder items (after drag and drop)
   */
  reorderItems(items: FlowItem[]): Promise<boolean> {
    const flow = this.flow$.value;
    if (!flow) {
      return Promise.resolve(false);
    }

    const updatedItems = items.map((item, index) => ({ ...item, order: index }));
    return this.data.store({ items: updatedItems }, FlowService.collection, flow.id);
  }

  /**
   * Update session marker date
   */
  updateSessionMarker(itemId: string, date: Timestamp): Promise<boolean> {
    const flow = this.flow$.value;
    if (!flow) {
      return Promise.resolve(false);
    }

    const updatedItems = flow.items.map(item => {
      if (item.id === itemId && item.type === 'session-marker') {
        return { ...item, date: date as any };
      }
      return item;
    });

    return this.data.store({ items: updatedItems }, FlowService.collection, flow.id);
  }

  /**
   * Update general note content
   */
  updateGeneralNote(itemId: string, content: string): Promise<boolean> {
    const flow = this.flow$.value;
    if (!flow) {
      return Promise.resolve(false);
    }

    const updatedItems = flow.items.map(item => {
      if (item.id === itemId && item.type === 'general-note') {
        return { ...item, content };
      }
      return item;
    });

    return this.data.store({ items: updatedItems }, FlowService.collection, flow.id);
  }
}
