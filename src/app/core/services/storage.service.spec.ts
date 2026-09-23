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
    const storageBucket = () => mockApi.storage.from.calls.mostRecent().returnValue;
    const uploadedPath = () => storageBucket().upload.calls.mostRecent().args[0];

    /** Makes the ref lookup return the currently stored path. */
    function storedPath(path: string | null) {
      mockApi.from.and.returnValue(createMockQueryBuilder({ data: { image: path } }));
    }

    it('should upload under a unique name so replacements get a new URL', async () => {
      const file = new Blob(['test'], { type: 'text/plain' });
      await service.uploadFile('avatar.jpg', file, 'images');
      const first = uploadedPath();
      await service.uploadFile('avatar.jpg', file, 'images');
      const second = uploadedPath();

      expect(first).toMatch(/^images\/avatar-[A-Za-z0-9_]{10}\.jpg$/);
      expect(second).not.toBe(first);
      expect(storageBucket().upload).toHaveBeenCalledWith(first, file, jasmine.objectContaining({ cacheControl: '259200' }));
    });

    it('should point the ref at the uploaded file', async () => {
      storedPath(null);
      const updateRef = { collection: 'people', attribute: 'image', id: 'p1' };

      await service.uploadFile('avatar.jpg', new Blob(['test']), 'images', updateRef);

      const builder = mockApi.from.calls.mostRecent().returnValue;
      expect(mockApi.from).toHaveBeenCalledWith('people');
      expect(builder.update).toHaveBeenCalledWith({ image: uploadedPath() });
      expect(builder.eq).toHaveBeenCalledWith('id', 'p1');
    });

    it('should remove the previous file once the ref points at the new one', async () => {
      storedPath('images/avatar-OLD0000000.jpg');
      const updateRef = { collection: 'people', attribute: 'image', id: 'p1' };

      await service.uploadFile('avatar.jpg', new Blob(['test']), 'images', updateRef);

      const builder = mockApi.from.calls.mostRecent().returnValue;
      expect(storageBucket().remove).toHaveBeenCalledWith(['images/avatar-OLD0000000.jpg']);
      expect(builder.update).toHaveBeenCalledBefore(storageBucket().remove);
    });

    it('should not remove anything when there was no previous file', async () => {
      storedPath('');
      const updateRef = { collection: 'people', attribute: 'image', id: 'p1' };

      await service.uploadFile('avatar.jpg', new Blob(['test']), 'images', updateRef);

      expect(storageBucket().remove).not.toHaveBeenCalled();
    });

    it('should throw on upload error', async () => {
      const bucket = mockApi.storage.from('');
      bucket.upload.and.returnValue(
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

    it('should remove the file the ref points at and clear the ref', async () => {
      mockApi.from.and.returnValue(createMockQueryBuilder({ data: { image: 'images/avatar-abc1234567.jpg' } }));
      const updateRef = { collection: 'people', attribute: 'image', id: 'p1' };

      await service.delete('images', 'avatar.jpg', updateRef);

      const storageBucket = mockApi.storage.from.calls.mostRecent().returnValue;
      expect(storageBucket.remove).toHaveBeenCalledWith(['images/avatar-abc1234567.jpg']);
      expect(mockApi.from).toHaveBeenCalledWith('people');
      expect(mockApi.from.calls.mostRecent().returnValue.update).toHaveBeenCalledWith({ image: '' });
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
