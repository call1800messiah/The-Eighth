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
          id: 'e1', content: 'Event 1', date: '1 Praios', type: 'event',
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
          date: '15 Rondra',
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
          id: 'e1', content: 'Something happened', date: '15 Rondra', type: 'battle',
          owner_id: 'u1', created_at: '2024-06-01T00:00:00Z', modified_at: null,
        }]);
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
  });
});
