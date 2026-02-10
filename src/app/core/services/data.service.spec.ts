import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { DataService } from './data.service';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { RealtimeService } from './supabase-realtime.service';
import { InfoType } from '../enums/info-type.enum';
import {
  createMockApiService,
  createMockRealtimeService,
  createMockQueryBuilder,
} from '../../testing/supabase-test-helpers';

describe('DataService', () => {
  let service: DataService;
  let mockApi: ReturnType<typeof createMockApiService>;
  let mockAuth: any;
  let mockRealtime: ReturnType<typeof createMockRealtimeService>;

  beforeEach(() => {
    mockApi = createMockApiService();
    mockRealtime = createMockRealtimeService();
    mockAuth = {
      user: { id: 'user-1', email: 'test@example.com' },
      user$: of({ id: 'user-1' }),
      isLoggedIn: jasmine.createSpy('isLoggedIn').and.returnValue(of(true)),
    };

    TestBed.configureTestingModule({
      providers: [
        DataService,
        { provide: ApiService, useValue: mockApi },
        { provide: AuthService, useValue: mockAuth },
        { provide: RealtimeService, useValue: mockRealtime },
      ],
    });
    service = TestBed.inject(DataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('store()', () => {
    it('should strip Firebase access field', async () => {
      const item = { name: 'Test', access: ['u1', 'u2'] };
      await service.store(item, 'people', 'id-1');

      const storedItem = mockApi._queryBuilder.update.calls.mostRecent().args[0];
      expect(storedItem.access).toBeUndefined();
    });

    it('should strip Firebase collection field', async () => {
      const item = { name: 'Test', collection: 'people' };
      await service.store(item, 'people', 'id-1');

      const storedItem = mockApi._queryBuilder.update.calls.mostRecent().args[0];
      expect(storedItem.collection).toBeUndefined();
    });

    it('should strip Firebase isPrivate field', async () => {
      const item = { name: 'Test', isPrivate: true };
      await service.store(item, 'people', 'id-1');

      const storedItem = mockApi._queryBuilder.update.calls.mostRecent().args[0];
      expect(storedItem.isPrivate).toBeUndefined();
    });

    it('should map owner to owner_id and remove owner', async () => {
      const item = { name: 'Test', owner: 'u1' };
      await service.store(item, 'people', 'id-1');

      const storedItem = mockApi._queryBuilder.update.calls.mostRecent().args[0];
      expect(storedItem.owner_id).toBe('u1');
      expect(storedItem.owner).toBeUndefined();
    });

    it('should not overwrite existing owner_id with owner', async () => {
      const item = { name: 'Test', owner: 'u1', owner_id: 'u2' };
      await service.store(item, 'people', 'id-1');

      const storedItem = mockApi._queryBuilder.update.calls.mostRecent().args[0];
      expect(storedItem.owner_id).toBe('u2');
    });

    it('should use update + eq when id is provided', async () => {
      await service.store({ name: 'Test' }, 'notes', 'existing-id');

      expect(mockApi._queryBuilder.update).toHaveBeenCalled();
      expect(mockApi._queryBuilder.eq).toHaveBeenCalledWith('id', 'existing-id');
      expect(mockApi._queryBuilder.insert).not.toHaveBeenCalled();
    });

    it('should use insert when no id is provided', async () => {
      const insertBuilder = createMockQueryBuilder({ data: { id: 'new-id' } });
      mockApi.from.and.returnValue(insertBuilder);

      await service.store({ name: 'Test' }, 'notes');

      expect(insertBuilder.insert).toHaveBeenCalled();
    });

    it('should set owner_id from auth.user for new items', async () => {
      const insertBuilder = createMockQueryBuilder({ data: { id: 'new-id' } });
      mockApi.from.and.returnValue(insertBuilder);

      await service.store({ name: 'Test' }, 'notes');

      const storedItem = insertBuilder.insert.calls.mostRecent().args[0];
      expect(storedItem.owner_id).toBe('user-1');
    });

    it('should strip id field from the stored object', async () => {
      await service.store({ id: 'should-be-removed', name: 'Test' }, 'notes', 'id-1');

      const storedItem = mockApi._queryBuilder.update.calls.mostRecent().args[0];
      expect(storedItem.id).toBeUndefined();
    });

    it('should return success:true and id on successful update', async () => {
      const result = await service.store({ name: 'Test' }, 'notes', 'id-1');
      expect(result).toEqual({ success: true, id: 'id-1' });
    });

    it('should return success:false on error', async () => {
      const errorBuilder = createMockQueryBuilder({ error: { message: 'fail' } });
      mockApi.from.and.returnValue(errorBuilder);

      const result = await service.store({ name: 'Test' }, 'notes', 'id-1');
      expect(result).toEqual({ success: false });
    });
  });

  describe('delete()', () => {
    it('should call delete().eq() on the table', async () => {
      const result = await service.delete('item-1', 'notes');
      expect(mockApi.from).toHaveBeenCalledWith('notes');
      expect(mockApi._queryBuilder.delete).toHaveBeenCalled();
      expect(mockApi._queryBuilder.eq).toHaveBeenCalledWith('id', 'item-1');
      expect(result).toBe(true);
    });

    it('should return false on error', async () => {
      const errorBuilder = createMockQueryBuilder({ error: { message: 'fail' } });
      mockApi.from.and.returnValue(errorBuilder);

      const result = await service.delete('item-1', 'notes');
      expect(result).toBe(false);
    });
  });

  describe('getInfos()', () => {
    it('should call realtime.watch with correct filters', () => {
      service.getInfos('person-1', 'people');
      expect(mockRealtime.watch).toHaveBeenCalledWith(
        'info_boxes',
        jasmine.any(Function),
        'info_boxes:people:person-1',
      );
    });

    it('should transform info rows into Map grouped by InfoType', (done) => {
      service.getInfos('p1', 'people').subscribe(infos => {
        expect(infos instanceof Map).toBe(true);
        const notes = infos.get(InfoType.Note);
        expect(notes).toBeTruthy();
        expect(notes.length).toBe(1);
        expect(notes[0].content).toBe('Hello');
        expect(notes[0].id).toBe('info-1');
        expect(notes[0].owner).toBe('u1');
        expect(notes[0].collection).toBe('info_boxes');
        done();
      });

      mockRealtime.emitRows('info_boxes:people:p1', [
        { id: 'info-1', type: 'note', content: 'Hello', owner_id: 'u1', created_at: '2024-01-01T00:00:00Z', modified_at: null },
      ]);
    });

    it('should map DB info_type to InfoType enum correctly', (done) => {
      service.getInfos('p1', 'people').subscribe(infos => {
        expect(infos.has(InfoType.Appearance)).toBe(true);
        expect(infos.has(InfoType.Background)).toBe(true);
        expect(infos.has(InfoType.Character)).toBe(true);
        done();
      });

      mockRealtime.emitRows('info_boxes:people:p1', [
        { id: 'i1', type: 'appearance', content: 'A', owner_id: 'u1', created_at: null, modified_at: null },
        { id: 'i2', type: 'background', content: 'B', owner_id: 'u1', created_at: null, modified_at: null },
        { id: 'i3', type: 'character', content: 'C', owner_id: 'u1', created_at: null, modified_at: null },
      ]);
    });

    it('should default unknown type to InfoType.Note', (done) => {
      service.getInfos('p1', 'people').subscribe(infos => {
        const notes = infos.get(InfoType.Note);
        expect(notes).toBeTruthy();
        expect(notes.length).toBe(1);
        done();
      });

      mockRealtime.emitRows('info_boxes:people:p1', [
        { id: 'i1', type: 'unknown_type', content: 'X', owner_id: 'u1', created_at: null, modified_at: null },
      ]);
    });

    it('should convert created_at and modified_at to Date objects', (done) => {
      service.getInfos('p1', 'people').subscribe(infos => {
        const notes = infos.get(InfoType.Note);
        expect(notes[0].created instanceof Date).toBe(true);
        expect(notes[0].modified instanceof Date).toBe(true);
        done();
      });

      mockRealtime.emitRows('info_boxes:people:p1', [
        { id: 'i1', type: 'note', content: 'X', owner_id: 'u1', created_at: '2024-01-01T00:00:00Z', modified_at: '2024-06-15T12:00:00Z' },
      ]);
    });
  });
});
