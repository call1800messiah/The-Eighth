import { TestBed } from '@angular/core/testing';

import { NotesService } from './notes.service';
import { DataService } from '../../core/services/data.service';
import { RealtimeService } from '../../core/services/supabase-realtime.service';
import { InfoType } from '../../core/enums/info-type.enum';
import { createMockDataService, createMockRealtimeService } from '../../testing/supabase-test-helpers';

describe('NotesService', () => {
  let service: NotesService;
  let mockData: ReturnType<typeof createMockDataService>;
  let mockRealtime: ReturnType<typeof createMockRealtimeService>;

  beforeEach(() => {
    mockData = createMockDataService();
    mockRealtime = createMockRealtimeService();

    TestBed.configureTestingModule({
      providers: [
        NotesService,
        { provide: DataService, useValue: mockData },
        { provide: RealtimeService, useValue: mockRealtime },
      ],
    });
    service = TestBed.inject(NotesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getNotes()', () => {
    it('should call realtime.watch for notes table', () => {
      service.getNotes().subscribe();
      expect(mockRealtime.watch).toHaveBeenCalledWith('notes', undefined, 'notes');
    });

    it('should transform DB rows to Note objects', (done) => {
      service.getNotes().subscribe(notes => {
        if (notes.length === 0) return;
        expect(notes.length).toBe(1);
        expect(notes[0]).toEqual(jasmine.objectContaining({
          id: 'n1',
          title: 'My Note',
          content: 'Hello world',
          category: 'general',
          owner: 'u1',
          collection: 'notes',
          type: InfoType.Note,
        }));
        expect(notes[0].access).toEqual([]);
        done();
      });

      mockRealtime.emitRows('notes', [{
        id: 'n1',
        title: 'My Note',
        content: 'Hello world',
        category: 'general',
        owner_id: 'u1',
        created_at: '2024-01-01T00:00:00Z',
        modified_at: null,
      }]);
    });

    it('should convert created_at to Date', (done) => {
      service.getNotes().subscribe(notes => {
        if (notes.length === 0) return;
        expect(notes[0].created instanceof Date).toBe(true);
        done();
      });

      mockRealtime.emitRows('notes', [{
        id: 'n1', title: 'A', content: '', category: null,
        owner_id: 'u1', created_at: '2024-06-01T00:00:00Z', modified_at: null,
      }]);
    });

    it('should sort notes by title', (done) => {
      service.getNotes().subscribe(notes => {
        if (notes.length === 0) return;
        expect(notes[0].title).toBe('Alpha');
        expect(notes[1].title).toBe('Beta');
        done();
      });

      mockRealtime.emitRows('notes', [
        { id: 'n2', title: 'Beta', content: '', category: null, owner_id: 'u1', created_at: null, modified_at: null },
        { id: 'n1', title: 'Alpha', content: '', category: null, owner_id: 'u1', created_at: null, modified_at: null },
      ]);
    });

    it('should return the same observable on subsequent calls', () => {
      const obs1 = service.getNotes();
      const obs2 = service.getNotes();
      expect(obs1).toBe(obs2);
    });
  });

  describe('store()', () => {
    it('should delegate to DataService.store', async () => {
      await service.store({ title: 'New Note' }, 'n1');
      expect(mockData.store).toHaveBeenCalledWith({ title: 'New Note' }, 'notes', 'n1');
    });

    it('should pass undefined id for new notes', async () => {
      await service.store({ title: 'New Note' });
      expect(mockData.store).toHaveBeenCalledWith({ title: 'New Note' }, 'notes', undefined);
    });
  });
});
