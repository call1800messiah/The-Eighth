import { TestBed } from '@angular/core/testing';

import { TimelineService } from './timeline.service';
import { DataService } from '../../core/services/data.service';
import { RealtimeService } from '../../core/services/supabase-realtime.service';
import { createMockDataService, createMockRealtimeService } from '../../testing/supabase-test-helpers';

describe('TimelineService', () => {
  let service: TimelineService;
  let mockData: ReturnType<typeof createMockDataService>;
  let mockRealtime: ReturnType<typeof createMockRealtimeService>;

  beforeEach(() => {
    mockData = createMockDataService();
    mockRealtime = createMockRealtimeService();

    TestBed.configureTestingModule({
      providers: [
        TimelineService,
        { provide: DataService, useValue: mockData },
        { provide: RealtimeService, useValue: mockRealtime },
      ],
    });
    service = TestBed.inject(TimelineService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getEvents()', () => {
    it('should call realtime.watch for historic_events table', (done) => {
      service.getEvents('tl1').subscribe(() => {
        expect(mockRealtime.watch).toHaveBeenCalledWith(
          'historic_events',
          jasmine.any(Function),
          jasmine.stringMatching(/^historic_events:tl1:/),
        );
        done();
      });

      // The debounceTime(300) requires us to wait; emit data after a tick
      setTimeout(() => {
        // The watch was called; emit data to its cache key
        const cacheKey = mockRealtime.watch.calls.mostRecent().args[2];
        mockRealtime.emitRows(cacheKey, [{
          id: 'e1', content: 'Event 1', date_day: 5, date_precision: 'month', date_legacy: null, type: 'event',
          owner_id: 'u1', created_at: '2024-06-01T00:00:00Z', modified_at: null,
        }]);
      }, 350);
    });

    it('should transform event rows with field mapping', (done) => {
      service.getEvents('tl2').subscribe(events => {
        expect(events.length).toBe(1);
        expect(events[0]).toEqual(jasmine.objectContaining({
          id: 'e1',
          content: 'Something happened',
          date: { day: 9, precision: 'day' },
          dateLegacy: 'alt',
          type: 'battle',
          owner: 'u1',
          collection: 'historic_events',
        }));
        expect(events[0].access).toEqual([]);
        expect(events[0].created instanceof Date).toBe(true);
        done();
      });

      setTimeout(() => {
        const cacheKey = mockRealtime.watch.calls.mostRecent().args[2];
        mockRealtime.emitRows(cacheKey, [{
          id: 'e1', content: 'Something happened', date_day: 9, date_precision: 'day', date_legacy: 'alt', type: 'battle',
          owner_id: 'u1', created_at: '2024-06-01T00:00:00Z', modified_at: null,
        }]);
      }, 350);
    });
  });

  describe('ordering', () => {
    it('should order by in-game date, undated first, then by creation', (done) => {
      service.getEvents('tl3').subscribe();
      setTimeout(() => {
        const queryFn = mockRealtime.watch.calls.mostRecent().args[1];
        const calls: string[] = [];
        const builder: any = {};
        for (const name of ['select', 'eq', 'order', 'limit']) {
          builder[name] = (...args: any[]) => { calls.push(`${name}:${JSON.stringify(args)}`); return builder; };
        }
        queryFn(builder);
        const orders = calls.filter(c => c.startsWith('order:'));
        expect(orders).toEqual([
          'order:["date_day",{"ascending":false,"nullsFirst":true}]',
          'order:["created_at",{"ascending":false}]',
        ]);
        done();
      }, 350);
    });

    it('should keep the row order of the query result', (done) => {
      service.getEvents('tl4').subscribe(events => {
        expect(events.map(e => e.id)).toEqual(['b', 'a', 'c']);
        done();
      });
      setTimeout(() => {
        const cacheKey = mockRealtime.watch.calls.mostRecent().args[2];
        const row = (id: string, created: string) => ({
          id, content: '', date_day: null, date_precision: null, date_legacy: null, type: 0,
          owner_id: 'u1', created_at: created, modified_at: null,
        });
        mockRealtime.emitRows(cacheKey, [row('b', '2024-01-01T00:00:00Z'), row('a', '2024-03-01T00:00:00Z'), row('c', '2024-02-01T00:00:00Z')]);
      }, 350);
    });
  });

  describe('getTimeline()', () => {
    it('should call realtime.watchOne for a timeline by id', () => {
      service.getTimeline('tl1').subscribe();
      expect(mockRealtime.watchOne).toHaveBeenCalledWith('timelines', 'tl1');
    });

    it('should transform timeline row and include events observable', (done) => {
      service.getTimeline('tl1').subscribe(timeline => {
        expect(timeline.id).toBe('tl1');
        expect(timeline.name).toBe('Main Timeline');
        expect(timeline.events).toBeDefined();
        done();
      });

      mockRealtime.emitOne('timelines:tl1', { id: 'tl1', name: 'Main Timeline' });
    });
  });

  describe('store()', () => {
    it('should delegate to DataService.store for events', async () => {
      await service.store({ content: 'New event' } as any, 'e1');
      expect(mockData.store).toHaveBeenCalledWith(
        { content: 'New event' },
        'historic_events',
        'e1',
      );
    });

    it('should write a date as columns and clear the legacy text', async () => {
      await service.store({ date: { day: 3, precision: 'month' }, dateLegacy: 'alt' } as any, 'e1');
      const stored = mockData.store.calls.mostRecent().args[0];
      expect(stored.date_day).toBe(3);
      expect(stored.date_precision).toBe('month');
      expect(stored.date_legacy).toBeNull();
      expect(stored.date).toBeUndefined();
      expect(stored.dateLegacy).toBeUndefined();
    });

    it('should keep the legacy text when the date is null', async () => {
      await service.store({ date: null } as any, 'e1');
      const stored = mockData.store.calls.mostRecent().args[0];
      expect(stored.date_day).toBeNull();
      expect(stored.date_precision).toBeNull();
      expect('date_legacy' in stored).toBe(false);
    });

    it('should leave the date columns and legacy text alone without a date', async () => {
      await service.store({ content: 'x', dateLegacy: 'alt' } as any, 'e1');
      const stored = mockData.store.calls.mostRecent().args[0];
      expect('date_day' in stored).toBe(false);
      expect('date_legacy' in stored).toBe(false);
      expect('dateLegacy' in stored).toBe(false);
    });
  });
});
