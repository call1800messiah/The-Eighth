import { TestBed } from '@angular/core/testing';

import type { Scene } from '../models';
import { SceneService } from './scene.service';
import { ApiService } from '../../core/services/api.service';
import { RealtimeService } from '../../core/services/supabase-realtime.service';
import { StorageService } from '../../core/services/storage.service';
import {
  createMockApiService,
  createMockQueryBuilder,
  createMockRealtimeService,
  createMockStorageService,
} from '../../testing/supabase-test-helpers';

describe('SceneService', () => {
  let service: SceneService;
  let mockApi: ReturnType<typeof createMockApiService>;
  let mockRealtime: ReturnType<typeof createMockRealtimeService>;
  let mockStorage: ReturnType<typeof createMockStorageService>;

  const scene: Scene = {
    id: 'scene-1',
    image: 'https://example.com/scenes/scene-1/scene-abc.jpg',
    caption: 'Am Lagerfeuer',
    owner: 'user-1',
    people: ['p1', 'p2', 'hidden'],
  };

  beforeEach(() => {
    mockApi = createMockApiService();
    mockRealtime = createMockRealtimeService();
    mockStorage = createMockStorageService();

    TestBed.configureTestingModule({
      providers: [
        SceneService,
        { provide: ApiService, useValue: mockApi },
        { provide: RealtimeService, useValue: mockRealtime },
        { provide: StorageService, useValue: mockStorage },
      ],
    });
    service = TestBed.inject(SceneService);
  });

  describe('getScenesForPerson', () => {
    it('watches scenes with a per-person cache key and scene_people as trigger', () => {
      service.getScenesForPerson('p1').subscribe();

      expect(mockRealtime.watch).toHaveBeenCalledWith(
        'scenes',
        jasmine.any(Function),
        'scenes-p1',
        ['scene_people'],
      );
    });

    it('filters on the tagged person through an inner-joined alias', () => {
      service.getScenesForPerson('p1').subscribe();
      const queryFn = mockRealtime.watch.calls.mostRecent().args[1];
      const builder = createMockQueryBuilder();

      queryFn(builder);

      expect(builder.select).toHaveBeenCalledWith('*, match:scene_people!inner(person_id), scene_people(person_id)');
      expect(builder.eq).toHaveBeenCalledWith('match.person_id', 'p1');
    });

    it('maps rows to scenes and hides rows whose upload has not finished', () => {
      let result: Scene[] = [];
      service.getScenesForPerson('p1').subscribe(scenes => result = scenes);

      mockRealtime.emitRows('scenes-p1', [
        {
          id: 'scene-1', image: 'scenes/scene-1/scene-abc.jpg', caption: null, owner_id: 'user-1',
          match: [{ person_id: 'p1' }], scene_people: [{ person_id: 'p1' }, { person_id: 'p2' }],
        },
        { id: 'scene-2', image: '', caption: 'leer', owner_id: 'user-1', match: [], scene_people: [] },
      ]);

      expect(result).toEqual([{
        id: 'scene-1',
        image: 'https://example.com/scenes/scene-1/scene-abc.jpg',
        caption: '',
        owner: 'user-1',
        people: ['p1', 'p2'],
      }]);
    });
  });

  describe('create', () => {
    it('inserts the row, tags the people, then uploads into the scene folder', async () => {
      const sceneInsert = createMockQueryBuilder({ data: { id: 'new-scene' } });
      const peopleInsert = createMockQueryBuilder();
      mockApi.from.and.returnValues(sceneInsert, peopleInsert);
      const file = new File(['x'], 'Mein Bild.JPG', { type: 'image/jpeg' });

      await service.create(file, ' Am Fluss ', ['p1', 'p2']);

      expect(mockApi.from.calls.argsFor(0)).toEqual(['scenes']);
      expect(sceneInsert.insert).toHaveBeenCalledWith({ caption: 'Am Fluss' });
      expect(mockApi.from.calls.argsFor(1)).toEqual(['scene_people']);
      expect(peopleInsert.insert).toHaveBeenCalledWith([
        { scene_id: 'new-scene', person_id: 'p1' },
        { scene_id: 'new-scene', person_id: 'p2' },
      ]);
      expect(mockStorage.uploadFile).toHaveBeenCalledWith(
        'scene.jpg', file, 'scenes', { collection: 'scenes', attribute: 'image', id: 'new-scene' },
      );
    });

    it('deletes the row again when the upload fails', async () => {
      const sceneInsert = createMockQueryBuilder({ data: { id: 'new-scene' } });
      const peopleInsert = createMockQueryBuilder();
      const rollback = createMockQueryBuilder();
      mockApi.from.and.returnValues(sceneInsert, peopleInsert, rollback);
      mockStorage.uploadFile.and.returnValue(Promise.reject(new Error('upload failed')));
      const file = new File(['x'], 'bild.png', { type: 'image/png' });

      await expectAsync(service.create(file, '', ['p1'])).toBeRejectedWithError('upload failed');

      expect(mockApi.from.calls.argsFor(2)).toEqual(['scenes']);
      expect(rollback.delete).toHaveBeenCalled();
      expect(rollback.eq).toHaveBeenCalledWith('id', 'new-scene');
    });

    it('throws without uploading when the row insert fails', async () => {
      mockApi.from.and.returnValue(createMockQueryBuilder({ error: { message: 'denied' } }));
      const file = new File(['x'], 'bild.png', { type: 'image/png' });

      await expectAsync(service.create(file, '', ['p1'])).toBeRejected();

      expect(mockStorage.uploadFile).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates the caption and only writes the changed tags', async () => {
      const captionUpdate = createMockQueryBuilder();
      const tagDelete = createMockQueryBuilder();
      const tagInsert = createMockQueryBuilder();
      mockApi.from.and.returnValues(captionUpdate, tagDelete, tagInsert);

      // p2 removed, p3 added, p1 and 'hidden' untouched
      await service.update(scene, 'Neu', ['p1', 'hidden', 'p3']);

      expect(captionUpdate.update).toHaveBeenCalledWith({ caption: 'Neu' });
      expect(captionUpdate.eq).toHaveBeenCalledWith('id', 'scene-1');
      expect(tagDelete.delete).toHaveBeenCalled();
      expect(tagDelete.eq).toHaveBeenCalledWith('scene_id', 'scene-1');
      expect(tagDelete.in).toHaveBeenCalledWith('person_id', ['p2']);
      expect(tagInsert.insert).toHaveBeenCalledWith([{ scene_id: 'scene-1', person_id: 'p3' }]);
    });

    it('skips the tag writes when the people did not change', async () => {
      mockApi.from.and.returnValue(createMockQueryBuilder());

      await service.update(scene, 'Neu', ['hidden', 'p2', 'p1']);

      expect(mockApi.from).toHaveBeenCalledTimes(1);
    });
  });

  describe('delete', () => {
    it('removes the file before the row', async () => {
      const rowDelete = createMockQueryBuilder();
      mockApi.from.and.returnValue(rowDelete);
      mockStorage.delete.and.callFake(() => {
        expect(rowDelete.delete).not.toHaveBeenCalled();
        return Promise.resolve();
      });

      await service.delete(scene);

      expect(mockStorage.delete).toHaveBeenCalledWith(
        'scenes', '', { collection: 'scenes', attribute: 'image', id: 'scene-1' },
      );
      expect(rowDelete.delete).toHaveBeenCalled();
      expect(rowDelete.eq).toHaveBeenCalledWith('id', 'scene-1');
    });
  });

  describe('fileName', () => {
    it('keeps a safe lower-case extension', () => {
      expect(SceneService.fileName(new File([], 'Mein Bild.JPG'))).toBe('scene.jpg');
    });

    it('falls back to jpg for missing or odd extensions', () => {
      expect(SceneService.fileName(new File([], 'ohne-endung'))).toBe('scene.jpg');
      expect(SceneService.fileName(new File([], 'bild.jp g'))).toBe('scene.jpg');
      expect(SceneService.fileName(new File([], 'bild.äöü'))).toBe('scene.jpg');
    });
  });
});
