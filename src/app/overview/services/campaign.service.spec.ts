import { TestBed } from '@angular/core/testing';

import { CampaignService } from './campaign.service';
import { DataService } from '../../core/services/data.service';
import { RealtimeService } from '../../core/services/supabase-realtime.service';
import { createMockDataService, createMockRealtimeService } from '../../testing/supabase-test-helpers';

describe('CampaignService', () => {
  let service: CampaignService;
  let mockData: ReturnType<typeof createMockDataService>;
  let mockRealtime: ReturnType<typeof createMockRealtimeService>;

  beforeEach(() => {
    mockData = createMockDataService();
    mockRealtime = createMockRealtimeService();

    TestBed.configureTestingModule({
      providers: [
        CampaignService,
        { provide: DataService, useValue: mockData },
        { provide: RealtimeService, useValue: mockRealtime },
      ],
    });
    service = TestBed.inject(CampaignService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getCampaignInfo()', () => {
    it('should call realtime.watch for campaign table', () => {
      service.getCampaignInfo().subscribe();
      expect(mockRealtime.watch).toHaveBeenCalledWith('campaign', undefined, 'campaign');
    });

    it('should transform DB row with snake_case to camelCase', (done) => {
      service.getCampaignInfo().subscribe(campaign => {
        if (!campaign) return;
        expect(campaign).toEqual({
          captain: 'Captain Hook',
          crewcount: 42,
          date: { day: 100, precision: 'day' },
          dateLegacy: null,
          id: 'c1',
          isPrivate: false,
          name: 'My Campaign',
          owner: 'u1',
          ship: 'The Black Pearl',
          staminaReduction: 3,
          timelineId: 'tl1',
          xp: 1500,
        });
        done();
      });

      mockRealtime.emitRows('campaign', [{
        id: 'c1',
        captain: 'Captain Hook',
        crewcount: 42,
        date_day: 100,
        date_precision: 'day',
        date_legacy: null,
        name: 'My Campaign',
        owner_id: 'u1',
        ship: 'The Black Pearl',
        stamina_reduction: 3,
        timeline_id: 'tl1',
        xp: 1500,
      }]);
    });

    it('should return null when no campaign rows exist', (done) => {
      service.getCampaignInfo().subscribe(campaign => {
        expect(campaign).toBeNull();
        done();
      });

      mockRealtime.emitRows('campaign', []);
    });

    it('should return the same observable on subsequent calls', () => {
      const obs1 = service.getCampaignInfo();
      const obs2 = service.getCampaignInfo();
      expect(obs1).toBe(obs2);
    });
  });

  describe('store()', () => {
    it('should map staminaReduction to stamina_reduction for DB', async () => {
      await service.store({ staminaReduction: 5 } as any, 'c1');
      expect(mockData.store).toHaveBeenCalledWith(
        jasmine.objectContaining({ stamina_reduction: 5 }),
        'campaign',
        'c1',
      );
      const storedItem = mockData.store.calls.mostRecent().args[0];
      expect(storedItem.staminaReduction).toBeUndefined();
    });

    it('should map timelineId to timeline_id for DB', async () => {
      await service.store({ timelineId: 'tl2' } as any, 'c1');
      expect(mockData.store).toHaveBeenCalledWith(
        jasmine.objectContaining({ timeline_id: 'tl2' }),
        'campaign',
        'c1',
      );
      const storedItem = mockData.store.calls.mostRecent().args[0];
      expect(storedItem.timelineId).toBeUndefined();
    });

    it('should write a date as columns and clear the legacy text', async () => {
      await service.store({ date: { day: 7, precision: 'year' }, dateLegacy: 'alt' } as any, 'c1');
      const stored = mockData.store.calls.mostRecent().args[0];
      expect(stored.date_day).toBe(7);
      expect(stored.date_precision).toBe('year');
      expect(stored.date_legacy).toBeNull();
      expect(stored.date).toBeUndefined();
      expect(stored.dateLegacy).toBeUndefined();
    });

    it('should leave date columns and legacy text alone when no date is given', async () => {
      await service.store({ name: 'x' } as any, 'c1');
      const stored = mockData.store.calls.mostRecent().args[0];
      expect('date_day' in stored).toBe(false);
      expect('date_precision' in stored).toBe(false);
      expect('date_legacy' in stored).toBe(false);
    });

    it('should not write legacy text, even if the model carries it', async () => {
      await service.store({ name: 'x', dateLegacy: 'alt' } as any, 'c1');
      const stored = mockData.store.calls.mostRecent().args[0];
      expect('dateLegacy' in stored).toBe(false);
      expect('date_legacy' in stored).toBe(false);
    });

    it('should pass through fields that need no mapping', async () => {
      await service.store({ name: 'Updated', xp: 2000 } as any, 'c1');
      expect(mockData.store).toHaveBeenCalledWith(
        jasmine.objectContaining({ name: 'Updated', xp: 2000 }),
        'campaign',
        'c1',
      );
    });
  });
});
