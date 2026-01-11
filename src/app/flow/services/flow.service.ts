import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, Observable, of } from 'rxjs';
import { map, switchMap, take } from 'rxjs/operators';

import type { AuthUser } from '../../auth/models/auth-user';
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
import { AuthService } from '../../core/services/auth.service';
import { DataService } from '../../core/services/data.service';
import { ConfigService } from '../../core/services/config.service';
import { QuestsService } from '../../quests/services/quests.service';
import { PeopleService } from '../../people/services/people.service';
import { PlaceService } from '../../places/services/place.service';
import { NotesService } from '../../notes/services/notes.service';

@Injectable({
  providedIn: 'root'
})
export class FlowService {
  static readonly collection = 'flows';
  private flows$: BehaviorSubject<Flow[]>;
  private user: AuthUser;

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private data: DataService,
    private quests: QuestsService,
    private people: PeopleService,
    private places: PlaceService,
    private notes: NotesService
  ) {
    this.user = this.auth.user;
  }

  private static transformFlow(flowData: any, flowId: string): Flow {
    return {
      access: flowData.access || [],
      campaignId: flowData.campaignId || '',
      collection: FlowService.collection,
      createdAt: flowData.createdAt?.toDate() || new Date(),
      createdBy: flowData.createdBy || '',
      date: new Date(flowData.date),
      id: flowId,
      items: flowData.items,
      owner: flowData.owner,
      title: flowData.title || '',
      updatedAt: flowData.updatedAt?.toDate() || new Date()
    };
  }

  /**
   * Strip enriched data (entity field) from flow items before saving
   */
  private static stripEnrichedData(item: EnrichedFlowItem): FlowItem {
    const { entity, ...baseItem } = item as any;
    return baseItem as FlowItem;
  }

  /**
   * Sanitize flow item to remove undefined fields before saving to Firestore
   */
  private static sanitizeItem(item: FlowItem): any {
    const sanitized: any = {
      id: item.id,
      type: item.type,
      order: item.order
    };

    if (item.type === 'quest') {
      sanitized.questId = (item as any).questId;
    } else if (item.type === 'person') {
      sanitized.personId = (item as any).personId;
    } else if (item.type === 'place') {
      sanitized.placeId = (item as any).placeId;
    } else if (item.type === 'note') {
      sanitized.noteId = (item as any).noteId;
    }

    return sanitized;
  }

  /**
   * Get all flows for current user (multiple flows per campaign)
   */
  getFlows(): Observable<Flow[]> {
    if (!this.flows$) {
      this.flows$ = new BehaviorSubject<Flow[]>([]);
      // Query for all flows by user access
      this.api.getDataFromCollection(
        FlowService.collection,
        (ref) => ref.where('access', 'array-contains', this.user.id)
      ).pipe(
        map((flows) => {
          if (flows && flows.length > 0) {
            return flows.map(flow => {
              const flowDoc = flow.payload.doc;
              return FlowService.transformFlow(flowDoc.data(), flowDoc.id);
            }).sort((a, b) => b.date.getTime() - a.date.getTime()); // Sort newest first
          }
          return [];
        })
      ).subscribe((flows) => {
        this.flows$.next(flows);
      });
    }
    return this.flows$;
  }

  /**
   * Get specific flow by ID
   */
  getFlowById(id: string): Observable<Flow | null> {
    return this.getFlows().pipe(
      map(flows => flows.find(flow => flow.id === id) || null)
    );
  }

  /**
   * Get flow items enriched with entity data for specific flow
   */
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
    return this.data.store(flow, FlowService.collection, flowId);
  }

  /**
   * Add item to specific flow
   */
  async addItem(flowId: string, item: Partial<FlowItem>): Promise<boolean> {
    return this.addItems(flowId, [item]);
  }

  /**
   * Add multiple items to specific flow in a single write operation
   */
  async addItems(flowId: string, items: Partial<FlowItem>[]): Promise<boolean> {
    return new Promise((resolve) => {
      this.getFlowById(flowId).pipe(
        take(1),
        switchMap(flow => {
          if (!flow) {
            resolve(false);
            return of(null);
          }

          // Build all new items
          const newItems: FlowItem[] = [];
          let currentOrder = flow.items?.length || 0;

          for (const item of items) {
            const baseItem = {
              id: ConfigService.nanoid(),
              order: currentOrder++
            };

            let newItem: FlowItem;
            if (item.type === 'quest') {
              newItem = {
                ...baseItem,
                type: 'quest',
                questId: (item as any).questId
              };
            } else if (item.type === 'person') {
              newItem = {
                ...baseItem,
                type: 'person',
                personId: (item as any).personId
              };
            } else if (item.type === 'place') {
              newItem = {
                ...baseItem,
                type: 'place',
                placeId: (item as any).placeId
              };
            } else if (item.type === 'note') {
              newItem = {
                ...baseItem,
                type: 'note',
                noteId: (item as any).noteId
              };
            } else {
              continue; // Skip invalid items
            }
            newItems.push(newItem);
          }

          if (newItems.length === 0) {
            resolve(false);
            return of(null);
          }

          const updatedItems = [...flow.items, ...newItems].map(item => FlowService.sanitizeItem(item));
          return this.data.store({ items: updatedItems }, FlowService.collection, flowId);
        })
      ).subscribe((result) => {
        if (result) {
          resolve(result.success);
        }
      });
    });
  }

  /**
   * Remove item from specific flow
   */
  removeItem(flowId: string, itemId: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.getFlowById(flowId).pipe(
        take(1),
        switchMap(flow => {
          if (!flow) {
            resolve(false);
            return of(null);
          }

          const updatedItems = flow.items
            .filter(item => item.id !== itemId)
            .map((item, index) => ({ ...item, order: index }))
            .map(item => FlowService.sanitizeItem(item));

          return this.data.store({ items: updatedItems }, FlowService.collection, flowId);
        })
      ).subscribe((result) => {
        if (result) {
          resolve(result.success);
        }
      });
    });
  }

  /**
   * Reorder items for specific flow (after drag and drop)
   */
  reorderItems(flowId: string, items: EnrichedFlowItem[]): Promise<boolean> {
    // Strip enriched data, update order, and sanitize
    const updatedItems = items
      .map(item => FlowService.stripEnrichedData(item))
      .map((item, index) => ({ ...item, order: index }))
      .map(item => FlowService.sanitizeItem(item));

    return this.data.store({ items: updatedItems }, FlowService.collection, flowId).then(result => result.success);
  }
}
