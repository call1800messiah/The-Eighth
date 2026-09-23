import { TestBed } from '@angular/core/testing';

import { QuestsService } from './quests.service';
import { DataService } from '../../core/services/data.service';
import { RealtimeService } from '../../core/services/supabase-realtime.service';
import { createMockDataService, createMockRealtimeService } from '../../testing/supabase-test-helpers';

describe('QuestsService', () => {
  let service: QuestsService;
  let mockData: ReturnType<typeof createMockDataService>;
  let mockRealtime: ReturnType<typeof createMockRealtimeService>;

  beforeEach(() => {
    mockData = createMockDataService();
    mockRealtime = createMockRealtimeService();

    TestBed.configureTestingModule({
      providers: [
        QuestsService,
        { provide: DataService, useValue: mockData },
        { provide: RealtimeService, useValue: mockRealtime },
      ],
    });
    service = TestBed.inject(QuestsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getQuests()', () => {
    it('should call realtime.watch for quests table', () => {
      service.getQuests().subscribe();
      expect(mockRealtime.watch).toHaveBeenCalledWith('quests', undefined, 'quests');
    });

    it('should transform DB rows to Quest objects', (done) => {
      service.getQuests().subscribe(quests => {
        if (quests.length === 0) return;
        expect(quests.length).toBe(1);
        expect(quests[0]).toEqual(jasmine.objectContaining({
          id: 'q1',
          name: 'Save the Princess',
          description: 'She is in another castle',
          completed: false,
          type: 'main',
          owner: 'u1',
          collection: 'quests',
        }));
        done();
      });

      mockRealtime.emitRows('quests', [{
        id: 'q1', name: 'Save the Princess', description: 'She is in another castle',
        completed: false, type: 'main', owner_id: 'u1', parent_id: null,
      }]);
    });

    it('should set parent reference when parent_id is present', (done) => {
      service.getQuests().subscribe(quests => {
        if (quests.length === 0) return;
        const child = quests.find(q => q.id === 'q2');
        expect(child.parent).toBeDefined();
        expect(child.parent.id).toBe('q1');
        done();
      });

      mockRealtime.emitRows('quests', [
        { id: 'q1', name: 'Parent Quest', description: '', completed: false, type: 'main', owner_id: 'u1', parent_id: null },
        { id: 'q2', name: 'Child Quest', description: '', completed: false, type: 'sub', owner_id: 'u1', parent_id: 'q1' },
      ]);
    });

    it('should resolve parent names from the quest list', (done) => {
      service.getQuests().subscribe(quests => {
        if (quests.length === 0) return;
        const child = quests.find(q => q.id === 'q2');
        expect(child.parent.name).toBe('Parent Quest');
        done();
      });

      mockRealtime.emitRows('quests', [
        { id: 'q1', name: 'Parent Quest', description: '', completed: false, type: 'main', owner_id: 'u1', parent_id: null },
        { id: 'q2', name: 'Child Quest', description: '', completed: false, type: 'sub', owner_id: 'u1', parent_id: 'q1' },
      ]);
    });

    it('should build quest tree with subQuests', (done) => {
      service.getQuests().subscribe(quests => {
        if (quests.length === 0) return;
        const parent = quests.find(q => q.id === 'q1');
        expect(parent.subQuests).toBeDefined();
        expect(parent.subQuests.length).toBe(1);
        expect(parent.subQuests[0].id).toBe('q2');
        done();
      });

      mockRealtime.emitRows('quests', [
        { id: 'q1', name: 'Parent', description: '', completed: false, type: 'main', owner_id: 'u1', parent_id: null },
        { id: 'q2', name: 'Child', description: '', completed: false, type: 'sub', owner_id: 'u1', parent_id: 'q1' },
      ]);
    });

    it('should sort quests by name', (done) => {
      service.getQuests().subscribe(quests => {
        if (quests.length === 0) return;
        expect(quests[0].name).toBe('Alpha');
        expect(quests[1].name).toBe('Beta');
        done();
      });

      mockRealtime.emitRows('quests', [
        { id: 'q2', name: 'Beta', description: '', completed: false, type: 'main', owner_id: 'u1', parent_id: null },
        { id: 'q1', name: 'Alpha', description: '', completed: false, type: 'main', owner_id: 'u1', parent_id: null },
      ]);
    });
  });

  describe('store()', () => {
    it('should map parent object to parent_id', async () => {
      await service.store({ name: 'Quest', parent: { id: 'q1', name: 'Parent' } } as any, 'q2');
      const storedItem = mockData.store.calls.mostRecent().args[0];
      expect(storedItem.parent_id).toBe('q1');
      expect(storedItem.parent).toBeUndefined();
    });

    it('should strip subQuests before storing', async () => {
      await service.store({ name: 'Quest', subQuests: [] } as any, 'q1');
      const storedItem = mockData.store.calls.mostRecent().args[0];
      expect(storedItem.subQuests).toBeUndefined();
    });
  });

  describe('getQuestById()', () => {
    it('should return a specific quest by id', (done) => {
      service.getQuestById('q2').subscribe(quest => {
        if (!quest) return;
        expect(quest.id).toBe('q2');
        expect(quest.name).toBe('Quest Two');
        done();
      });

      mockRealtime.emitRows('quests', [
        { id: 'q1', name: 'Quest One', description: '', completed: false, type: 'main', owner_id: 'u1', parent_id: null },
        { id: 'q2', name: 'Quest Two', description: '', completed: false, type: 'sub', owner_id: 'u1', parent_id: null },
      ]);
    });
  });
});
