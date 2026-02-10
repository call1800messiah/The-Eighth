import { TestBed } from '@angular/core/testing';

import { StorageService } from './storage.service';
import { ApiService } from './api.service';
import { createMockApiService, createMockQueryBuilder } from '../../testing/supabase-test-helpers';

describe('StorageService', () => {
  let service: StorageService;
  let mockApi: ReturnType<typeof createMockApiService>;

  beforeEach(() => {
    mockApi = createMockApiService();

    TestBed.configureTestingModule({
      providers: [
        StorageService,
        { provide: ApiService, useValue: mockApi },
      ],
    });
    service = TestBed.inject(StorageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getDownloadURL()', () => {
    it('should return a public URL for a file', (done) => {
      service.getDownloadURL('images/avatar.jpg').subscribe(url => {
        expect(url).toBe('https://example.com/file.jpg');
        expect(mockApi.storage.from).toHaveBeenCalled();
        done();
      });
    });
  });

  describe('uploadFile()', () => {
    it('should upload the file to the correct path', async () => {
      const file = new Blob(['test'], { type: 'text/plain' });
      await service.uploadFile('avatar.jpg', file, 'images');

      const storageBucket = mockApi.storage.from.calls.mostRecent().returnValue;
      expect(storageBucket.upload).toHaveBeenCalledWith(
        'images/avatar.jpg',
        file,
        jasmine.objectContaining({ cacheControl: '259200', upsert: true }),
      );
    });

    it('should update ref after upload when updateRef is provided', async () => {
      const file = new Blob(['test']);
      const updateRef = { collection: 'people', attribute: 'image', id: 'p1' };

      await service.uploadFile('avatar.jpg', file, 'images', updateRef);

      expect(mockApi.from).toHaveBeenCalledWith('people');
      expect(mockApi._queryBuilder.update).toHaveBeenCalledWith({ image: 'images/avatar.jpg' });
      expect(mockApi._queryBuilder.eq).toHaveBeenCalledWith('id', 'p1');
    });

    it('should throw on upload error', async () => {
      const storageBucket = mockApi.storage.from('');
      storageBucket.upload.and.returnValue(
        Promise.resolve({ data: null, error: { message: 'Upload failed' } })
      );

      await expectAsync(
        service.uploadFile('fail.jpg', new Blob([]), 'images')
      ).toBeRejected();
    });
  });

  describe('delete()', () => {
    it('should remove the file from storage', async () => {
      await service.delete('images', 'avatar.jpg');

      const storageBucket = mockApi.storage.from.calls.mostRecent().returnValue;
      expect(storageBucket.remove).toHaveBeenCalledWith(['images/avatar.jpg']);
    });

    it('should clear updateRef attribute after delete', async () => {
      const updateRef = { collection: 'people', attribute: 'image', id: 'p1' };
      await service.delete('images', 'avatar.jpg', updateRef);

      expect(mockApi.from).toHaveBeenCalledWith('people');
      expect(mockApi._queryBuilder.update).toHaveBeenCalledWith({ image: '' });
    });

    it('should throw on storage error', async () => {
      const storageBucket = mockApi.storage.from('');
      storageBucket.remove.and.returnValue(
        Promise.resolve({ data: null, error: { message: 'Delete failed' } })
      );

      await expectAsync(
        service.delete('images', 'avatar.jpg')
      ).toBeRejected();
    });
  });

  describe('listFiles()', () => {
    it('should return file paths from the folder', async () => {
      const storageBucket = mockApi.storage.from('');
      storageBucket.list.and.returnValue(
        Promise.resolve({
          data: [
            { name: 'track1.mp3' },
            { name: 'track2.mp3' },
          ],
          error: null,
        })
      );

      const files = await service.listFiles('audio');
      expect(files).toEqual(['audio/track1.mp3', 'audio/track2.mp3']);
    });

    it('should filter out .emptyFolderPlaceholder', async () => {
      const storageBucket = mockApi.storage.from('');
      storageBucket.list.and.returnValue(
        Promise.resolve({
          data: [
            { name: '.emptyFolderPlaceholder' },
            { name: 'track1.mp3' },
          ],
          error: null,
        })
      );

      const files = await service.listFiles('audio');
      expect(files).toEqual(['audio/track1.mp3']);
    });

    it('should return empty array on error', async () => {
      const storageBucket = mockApi.storage.from('');
      storageBucket.list.and.returnValue(
        Promise.resolve({ data: null, error: { message: 'Error' } })
      );

      const files = await service.listFiles('audio');
      expect(files).toEqual([]);
    });
  });
});
