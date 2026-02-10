import { TestBed } from '@angular/core/testing';

import { InventoryService } from './inventory.service';
import { DataService } from '../../core/services/data.service';
import { RealtimeService } from '../../core/services/supabase-realtime.service';
import { createMockDataService, createMockRealtimeService } from '../../testing/supabase-test-helpers';

describe('InventoryService', () => {
  let service: InventoryService;
  let mockData: ReturnType<typeof createMockDataService>;
  let mockRealtime: ReturnType<typeof createMockRealtimeService>;

  beforeEach(() => {
    mockData = createMockDataService();
    mockRealtime = createMockRealtimeService();

    TestBed.configureTestingModule({
      providers: [
        InventoryService,
        { provide: DataService, useValue: mockData },
        { provide: RealtimeService, useValue: mockRealtime },
      ],
    });
    service = TestBed.inject(InventoryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getInventory()', () => {
    it('should call realtime.watch for inventory table', () => {
      service.getInventory().subscribe();
      expect(mockRealtime.watch).toHaveBeenCalledWith('inventory', undefined, 'inventory');
    });

    it('should transform DB rows to InventoryItem objects', (done) => {
      service.getInventory().subscribe(items => {
        if (items.length === 0) return;
        expect(items.length).toBe(1);
        expect(items[0]).toEqual({
          id: 'inv1',
          amount: 5,
          character: 'char1',
          isPrivate: false,
          name: 'Healing Potion',
          owner: 'u1',
        });
        done();
      });

      mockRealtime.emitRows('inventory', [{
        id: 'inv1',
        amount: 5,
        character: 'char1',
        name: 'Healing Potion',
        owner_id: 'u1',
      }]);
    });

    it('should always set isPrivate to false', (done) => {
      service.getInventory().subscribe(items => {
        if (items.length === 0) return;
        expect(items[0].isPrivate).toBe(false);
        done();
      });

      mockRealtime.emitRows('inventory', [{
        id: 'inv1', amount: 1, character: null, name: 'Item', owner_id: 'u1',
      }]);
    });

    it('should return the same observable on subsequent calls', () => {
      const obs1 = service.getInventory();
      const obs2 = service.getInventory();
      expect(obs1).toBe(obs2);
    });
  });

  describe('store()', () => {
    it('should delegate to DataService.store', async () => {
      await service.store({ name: 'Sword', amount: 1 }, 'inv1');
      expect(mockData.store).toHaveBeenCalledWith({ name: 'Sword', amount: 1 }, 'inventory', 'inv1');
    });
  });
});
