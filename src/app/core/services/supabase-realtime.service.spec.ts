import { TestBed } from '@angular/core/testing';

import { RealtimeService } from './supabase-realtime.service';
import { SUPABASE_CLIENT } from '../providers/supabase.provider';
import { createMockQueryBuilder } from '../../testing/supabase-test-helpers';

describe('RealtimeService', () => {
  let service: RealtimeService;
  let mockSupabase: any;
  let mockQueryBuilder: any;
  let mockChannel: any;

  beforeEach(() => {
    mockQueryBuilder = createMockQueryBuilder({ data: [{ id: '1', name: 'Test' }] });

    mockChannel = {
      on: jasmine.createSpy('on').and.callFake(function(this: any) { return this; }),
      subscribe: jasmine.createSpy('subscribe').and.callFake(function(this: any) { return this; }),
    };

    mockSupabase = {
      from: jasmine.createSpy('from').and.returnValue(mockQueryBuilder),
      channel: jasmine.createSpy('channel').and.returnValue(mockChannel),
      removeChannel: jasmine.createSpy('removeChannel'),
    };

    TestBed.configureTestingModule({
      providers: [
        RealtimeService,
        { provide: SUPABASE_CLIENT, useValue: mockSupabase },
      ],
    });
    service = TestBed.inject(RealtimeService);
  });

  afterEach(() => {
    service.ngOnDestroy();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('watch()', () => {
    it('should fetch initial data from the table', (done) => {
      service.watch<any>('people' as any).subscribe(data => {
        expect(data).toEqual([{ id: '1', name: 'Test' }]);
        expect(mockSupabase.from).toHaveBeenCalledWith('people');
        done();
      });
    });

    it('should subscribe to realtime changes', (done) => {
      service.watch<any>('notes' as any, undefined, 'notes').subscribe(() => {
        expect(mockSupabase.channel).toHaveBeenCalled();
        expect(mockChannel.on).toHaveBeenCalledWith(
          'postgres_changes',
          jasmine.objectContaining({ event: '*', schema: 'public', table: 'notes' }),
          jasmine.any(Function),
        );
        done();
      });
    });

    it('should return cached observable for same cache key', () => {
      const obs1 = service.watch<any>('people' as any, undefined, 'people-cache');
      const obs2 = service.watch<any>('people' as any, undefined, 'people-cache');
      expect(obs1).toBe(obs2);
    });

    it('should apply queryFn to the select query', (done) => {
      const queryFn = jasmine.createSpy('queryFn').and.returnValue(mockQueryBuilder);

      service.watch<any>('people' as any, queryFn).subscribe(() => {
        expect(queryFn).toHaveBeenCalled();
        done();
      });
    });

    it('should clean up channel on unsubscribe', (done) => {
      const sub = service.watch<any>('people' as any).subscribe(() => {
        sub.unsubscribe();
        expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel);
        done();
      });
    });

    it('should emit empty array when data is null', (done) => {
      const nullBuilder = createMockQueryBuilder({ data: null });
      mockSupabase.from.and.returnValue(nullBuilder);

      service.watch<any>('people' as any, undefined, 'null-test').subscribe(data => {
        expect(data).toEqual([]);
        done();
      });
    });
  });

  describe('watchOne()', () => {
    it('should fetch a single row by id', (done) => {
      const singleBuilder = createMockQueryBuilder({ data: { id: 'abc', name: 'Single' } });
      mockSupabase.from.and.returnValue(singleBuilder);

      service.watchOne<any>('people' as any, 'abc').subscribe(data => {
        expect(data).toEqual({ id: 'abc', name: 'Single' });
        expect(singleBuilder.eq).toHaveBeenCalledWith('id', 'abc');
        expect(singleBuilder.single).toHaveBeenCalled();
        done();
      });
    });

    it('should use custom select query when provided', (done) => {
      const singleBuilder = createMockQueryBuilder({ data: { id: 'x' } });
      mockSupabase.from.and.returnValue(singleBuilder);

      service.watchOne<any>('people' as any, 'x', '*, user_roles(role)').subscribe(() => {
        expect(singleBuilder.select).toHaveBeenCalledWith('*, user_roles(role)');
        done();
      });
    });

    it('should subscribe to realtime changes filtered by id', (done) => {
      const singleBuilder = createMockQueryBuilder({ data: { id: 'y' } });
      mockSupabase.from.and.returnValue(singleBuilder);

      service.watchOne<any>('notes' as any, 'y').subscribe(() => {
        expect(mockChannel.on).toHaveBeenCalledWith(
          'postgres_changes',
          jasmine.objectContaining({ filter: 'id=eq.y' }),
          jasmine.any(Function),
        );
        done();
      });
    });
  });

  describe('ngOnDestroy()', () => {
    it('should remove all channels and clear cache', (done) => {
      service.watch<any>('people' as any, undefined, 'destroy-test').subscribe(() => {
        service.ngOnDestroy();
        expect(mockSupabase.removeChannel).toHaveBeenCalled();
        done();
      });
    });
  });
});
