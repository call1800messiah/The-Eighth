import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';

import { FlowService } from './flow.service';
import { ApiService } from '../../core/services/api.service';
import { DataService } from '../../core/services/data.service';
import { QuestsService } from '../../quests/services/quests.service';
import { PeopleService } from '../../people/services/people.service';
import { PlaceService } from '../../places/services/place.service';
import { NotesService } from '../../notes/services/notes.service';
import { RealtimeService } from '../../core/services/supabase-realtime.service';
import {
  createMockApiService,
  createMockDataService,
  createMockRealtimeService,
} from '../../testing/supabase-test-helpers';

describe('FlowService', () => {
  let service: FlowService;
  let mockApi: ReturnType<typeof createMockApiService>;
  let mockData: ReturnType<typeof createMockDataService>;
  let mockRealtime: ReturnType<typeof createMockRealtimeService>;
  let mockQuests: any;
  let mockPeople: any;
  let mockPlaces: any;
  let mockNotes: any;

  const quests$ = new BehaviorSubject([{ id: 'quest1', name: 'Test Quest' }]);
  const people$ = new BehaviorSubject([{ id: 'person1', name: 'Test Person' }]);
  const places$ = new BehaviorSubject([{ id: 'place1', name: 'Test Place' }]);
  const notes$ = new BehaviorSubject([{ id: 'note1', title: 'Test Note' }]);

  beforeEach(() => {
    mockApi = createMockApiService();
    mockData = createMockDataService();
    mockRealtime = createMockRealtimeService();
    mockQuests = { getQuests: jasmine.createSpy('getQuests').and.returnValue(quests$) };
    mockPeople = { getPeople: jasmine.createSpy('getPeople').and.returnValue(people$) };
    mockPlaces = { getPlaces: jasmine.createSpy('getPlaces').and.returnValue(places$) };
    mockNotes = { getNotes: jasmine.createSpy('getNotes').and.returnValue(notes$) };

    TestBed.configureTestingModule({
      providers: [
        FlowService,
        { provide: ApiService, useValue: mockApi },
        { provide: DataService, useValue: mockData },
        { provide: RealtimeService, useValue: mockRealtime },
        { provide: QuestsService, useValue: mockQuests },
        { provide: PeopleService, useValue: mockPeople },
        { provide: PlaceService, useValue: mockPlaces },
        { provide: NotesService, useValue: mockNotes },
      ],
    });
    service = TestBed.inject(FlowService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getFlows()', () => {
    it('should call realtime.watch for flows table with items join', () => {
      service.getFlows().subscribe();
      expect(mockRealtime.watch).toHaveBeenCalledWith(
        'flows',
        jasmine.any(Function),
        'flows',
        ['flow_items'],
      );
    });

    it('should transform flow rows with items', (done) => {
      service.getFlows().subscribe(flows => {
        if (flows.length === 0) return;
        expect(flows[0]).toEqual(jasmine.objectContaining({
          id: 'f1',
          title: 'Session 1',
          owner: 'u1',
          collection: 'flows',
        }));
        expect(flows[0].date instanceof Date).toBe(true);
        expect(flows[0].items.length).toBe(1);
        done();
      });

      mockRealtime.emitRows('flows', [{
        id: 'f1', title: 'Session 1', date: '2024-06-01T00:00:00Z', owner_id: 'u1',
        flow_items: [
          { id: 'fi1', type: 'quest', entity_id: 'quest1', sort_order: 0 },
        ],
      }]);
    });

    it('should transform quest flow items', (done) => {
      service.getFlows().subscribe(flows => {
        if (flows.length === 0) return;
        const item = flows[0].items[0];
        expect(item.type).toBe('quest');
        expect((item as any).questId).toBe('quest1');
        done();
      });

      mockRealtime.emitRows('flows', [{
        id: 'f1', title: 'S1', date: '2024-01-01', owner_id: 'u1',
        flow_items: [{ id: 'fi1', type: 'quest', entity_id: 'quest1', sort_order: 0 }],
      }]);
    });

    it('should transform person flow items', (done) => {
      service.getFlows().subscribe(flows => {
        if (flows.length === 0) return;
        expect((flows[0].items[0] as any).personId).toBe('person1');
        done();
      });

      mockRealtime.emitRows('flows', [{
        id: 'f1', title: 'S1', date: '2024-01-01', owner_id: 'u1',
        flow_items: [{ id: 'fi1', type: 'person', entity_id: 'person1', sort_order: 0 }],
      }]);
    });

    it('should transform place flow items', (done) => {
      service.getFlows().subscribe(flows => {
        if (flows.length === 0) return;
        expect((flows[0].items[0] as any).placeId).toBe('place1');
        done();
      });

      mockRealtime.emitRows('flows', [{
        id: 'f1', title: 'S1', date: '2024-01-01', owner_id: 'u1',
        flow_items: [{ id: 'fi1', type: 'place', entity_id: 'place1', sort_order: 0 }],
      }]);
    });

    it('should transform note flow items', (done) => {
      service.getFlows().subscribe(flows => {
        if (flows.length === 0) return;
        expect((flows[0].items[0] as any).noteId).toBe('note1');
        done();
      });

      mockRealtime.emitRows('flows', [{
        id: 'f1', title: 'S1', date: '2024-01-01', owner_id: 'u1',
        flow_items: [{ id: 'fi1', type: 'note', entity_id: 'note1', sort_order: 0 }],
      }]);
    });

    it('should sort items by sort_order', (done) => {
      service.getFlows().subscribe(flows => {
        if (flows.length === 0) return;
        expect(flows[0].items[0].order).toBe(0);
        expect(flows[0].items[1].order).toBe(1);
        done();
      });

      mockRealtime.emitRows('flows', [{
        id: 'f1', title: 'S1', date: '2024-01-01', owner_id: 'u1',
        flow_items: [
          { id: 'fi2', type: 'quest', entity_id: 'q2', sort_order: 1 },
          { id: 'fi1', type: 'quest', entity_id: 'q1', sort_order: 0 },
        ],
      }]);
    });

    it('should sort flows by date descending', (done) => {
      service.getFlows().subscribe(flows => {
        if (flows.length === 0) return;
        expect(flows[0].title).toBe('Newer');
        expect(flows[1].title).toBe('Older');
        done();
      });

      mockRealtime.emitRows('flows', [
        { id: 'f1', title: 'Older', date: '2024-01-01', owner_id: 'u1', flow_items: [] },
        { id: 'f2', title: 'Newer', date: '2024-06-01', owner_id: 'u1', flow_items: [] },
      ]);
    });
  });

  describe('getEnrichedFlowItems()', () => {
    it('should enrich quest items with entity data', (done) => {
      // First set up a flow via getFlows
      service.getFlows().subscribe();
      mockRealtime.emitRows('flows', [{
        id: 'f1', title: 'S1', date: '2024-01-01', owner_id: 'u1',
        flow_items: [{ id: 'fi1', type: 'quest', entity_id: 'quest1', sort_order: 0 }],
      }]);

      service.getEnrichedFlowItems('f1').subscribe(items => {
        if (items.length === 0) return;
        expect(items[0].type).toBe('quest');
        expect((items[0] as any).entity).toBeDefined();
        expect((items[0] as any).entity.name).toBe('Test Quest');
        done();
      });
    });

    it('should set entity to null for deleted quest', (done) => {
      service.getFlows().subscribe();
      mockRealtime.emitRows('flows', [{
        id: 'f1', title: 'S1', date: '2024-01-01', owner_id: 'u1',
        flow_items: [{ id: 'fi1', type: 'quest', entity_id: 'deleted-id', sort_order: 0 }],
      }]);

      service.getEnrichedFlowItems('f1').subscribe(items => {
        if (items.length === 0) return;
        expect((items[0] as any).entity).toBeNull();
        done();
      });
    });

    it('should return empty array when flow not found', (done) => {
      service.getFlows().subscribe();
      mockRealtime.emitRows('flows', []);

      service.getEnrichedFlowItems('nonexistent').subscribe(items => {
        expect(items).toEqual([]);
        done();
      });
    });
  });

  describe('storeFlow()', () => {
    it('should strip items before storing', async () => {
      await service.storeFlow({ title: 'New', items: [] } as any, 'f1');
      const storedItem = mockData.store.calls.mostRecent().args[0];
      expect(storedItem.items).toBeUndefined();
      expect(storedItem.title).toBe('New');
    });
  });

  describe('addItems()', () => {
    const emitFlow = (orders: number[]) => mockRealtime.emitRows('flows', [{
      id: 'f1', title: 'S1', date: '2024-01-01', owner_id: 'u1',
      flow_items: orders.map((order, i) => ({ id: `fi${i}`, type: 'quest', entity_id: 'quest1', sort_order: order })),
    }]);

    it('should let the database generate item ids', async () => {
      service.getFlows().subscribe();
      emitFlow([0]);

      await service.addItems('f1', [{ type: 'person', personId: 'person1' } as any]);

      const row = mockApi._queryBuilder.insert.calls.mostRecent().args[0][0];
      expect(row.id).toBeUndefined();
      expect(row).toEqual(jasmine.objectContaining({ flow_id: 'f1', type: 'person', entity_id: 'person1' }));
    });

    it('should append after the highest sort_order when earlier items were removed', async () => {
      service.getFlows().subscribe();
      emitFlow([0, 2]);

      await service.addItems('f1', [
        { type: 'person', personId: 'person1' } as any,
        { type: 'place', placeId: 'place1' } as any,
      ]);

      const rows = mockApi._queryBuilder.insert.calls.mostRecent().args[0];
      expect(rows.map((r: any) => r.sort_order)).toEqual([3, 4]);
    });
  });

  describe('reorderItems()', () => {
    /** In-memory flow_items table that enforces UNIQUE(flow_id, sort_order) like the database. */
    function useUniqueOrderTable(orders: Record<string, number>) {
      mockApi.from.and.callFake(() => {
        let patch: any;
        const builder: any = {
          update: (p: any) => { patch = p; return builder; },
          eq: (_col: string, id: string) => {
            const taken = Object.entries(orders).some(([other, order]) => other !== id && order === patch.sort_order);
            if (taken) {
              return Promise.resolve({ data: null, error: { code: '23505' } });
            }
            orders[id] = patch.sort_order;
            return Promise.resolve({ data: null, error: null });
          },
        };
        return builder;
      });
      return orders;
    }

    it('should persist the new order without violating the unique sort_order', async () => {
      const table = useUniqueOrderTable({ a: 0, b: 1, c: 2 });

      const success = await service.reorderItems('f1', [
        { id: 'c', order: 2 },
        { id: 'a', order: 0 },
        { id: 'b', order: 1 },
      ] as any);

      expect(success).toBe(true);
      expect(table).toEqual({ c: 0, a: 1, b: 2 });
    });
  });
});
