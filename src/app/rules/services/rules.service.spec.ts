import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';

import { RulesService } from './rules.service';
import { DataService } from '../../core/services/data.service';
import { RealtimeService } from '../../core/services/supabase-realtime.service';
import { createMockDataService, createMockRealtimeService } from '../../testing/supabase-test-helpers';

describe('RulesService', () => {
  let service: RulesService;
  let mockData: ReturnType<typeof createMockDataService>;
  let mockRealtime: ReturnType<typeof createMockRealtimeService>;
  let mockHttp: jasmine.SpyObj<HttpClient>;

  beforeEach(() => {
    mockData = createMockDataService();
    mockRealtime = createMockRealtimeService();
    mockHttp = jasmine.createSpyObj('HttpClient', ['get']);
    mockHttp.get.and.returnValue(of({ edition: 5, allowedAttributes: [] }));

    TestBed.configureTestingModule({
      providers: [
        RulesService,
        { provide: DataService, useValue: mockData },
        { provide: RealtimeService, useValue: mockRealtime },
        { provide: HttpClient, useValue: mockHttp },
      ],
    });
    service = TestBed.inject(RulesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getDynamicRules()', () => {
    it('should call realtime.watch for rules table', () => {
      service.getDynamicRules().subscribe();
      expect(mockRealtime.watch).toHaveBeenCalledWith('rules', undefined, 'rules');
    });

    it('should map category to type in transforms', (done) => {
      service.getDynamicRules().subscribe(rules => {
        if (rules.length === 0) return;
        expect(rules[0].type).toBe('advantage');
        expect(rules[0].name).toBe('Lucky');
        done();
      });

      mockRealtime.emitRows('rules', [{
        id: 'r1',
        name: 'Lucky',
        category: 'advantage',
      }]);
    });

    it('should sort rules by name', (done) => {
      service.getDynamicRules().subscribe(rules => {
        if (rules.length === 0) return;
        expect(rules[0].name).toBe('Alpha');
        expect(rules[1].name).toBe('Beta');
        done();
      });

      mockRealtime.emitRows('rules', [
        { id: 'r2', name: 'Beta', category: 'skill' },
        { id: 'r1', name: 'Alpha', category: 'feat' },
      ]);
    });

    it('should preserve all original row fields via spread', (done) => {
      service.getDynamicRules().subscribe(rules => {
        if (rules.length === 0) return;
        expect((rules[0] as any).attributeOne).toBe('MU');
        done();
      });

      mockRealtime.emitRows('rules', [{
        id: 'r1', name: 'Climbing', category: 'skill', attributeOne: 'MU',
      }]);
    });

    it('should use the same underlying subject on subsequent calls', () => {
      const obs1 = service.getDynamicRules();
      const obs2 = service.getDynamicRules();
      // getDynamicRules() returns .asObservable() which creates a new wrapper,
      // but the underlying data is shared (only one watch subscription)
      expect(mockRealtime.watch).toHaveBeenCalledTimes(1);
    });
  });

  describe('getRulesConfig()', () => {
    it('should load rules from JSON file', async () => {
      const rules = await service.getRulesConfig();
      expect(rules).toEqual({ edition: 5, allowedAttributes: [] } as any);
      expect(mockHttp.get).toHaveBeenCalled();
    });

    it('should cache the result after first load', async () => {
      await service.getRulesConfig();
      await service.getRulesConfig();
      expect(mockHttp.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('store()', () => {
    it('should delegate to DataService.store', async () => {
      const rule = { name: 'New Rule' } as any;
      await service.store(rule, 'r1');
      expect(mockData.store).toHaveBeenCalledWith(rule, 'rules', 'r1');
    });
  });
});
