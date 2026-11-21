import { TestBed } from '@angular/core/testing';

import { IMAGE_WIDTH, MAX_RENDER_PIXELS, StorageService } from './storage.service';
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

  describe('getImageURL()', () => {
    it('asks for a render URL scaled down to the width, keeping the aspect ratio', () => {
      const url = service.getImageURL('people/p1/portrait.png', IMAGE_WIDTH.thumb);
      const bucket = mockApi.storage.from.calls.mostRecent().returnValue;
      expect(bucket.getPublicUrl).toHaveBeenCalledWith('people/p1/portrait.png', {
        transform: { width: 400, resize: 'contain', quality: 80 },
      });
      expect(url).toBe('https://example.com/file.jpg');
    });

    it('has a thumb and a large width', () => {
      expect(IMAGE_WIDTH).toEqual({ thumb: 400, large: 1600 });
    });
  });

  describe('getPublicURL()', () => {
    it('returns the URL of the stored file, without a transform', () => {
      expect(service.getPublicURL('scenes/s1/scene.jpg')).toBe('https://example.com/file.jpg');
      const bucket = mockApi.storage.from.calls.mostRecent().returnValue;
      expect(bucket.getPublicUrl).toHaveBeenCalledWith('scenes/s1/scene.jpg');
    });
  });

  describe('renderScale()', () => {
    it('leaves an image within the limit at full size', () => {
      expect(StorageService.renderScale(4000, 4000)).toBe(1);
    });

    it('scales a 48 MP photo to the limit, keeping the aspect ratio', () => {
      const scale = StorageService.renderScale(8000, 6000);
      expect(scale).toBeLessThan(1);
      expect(Math.floor(8000 * scale) * Math.floor(6000 * scale)).toBeLessThanOrEqual(MAX_RENDER_PIXELS);
      expect(Math.floor(8000 * scale) * Math.floor(6000 * scale)).toBeGreaterThan(MAX_RENDER_PIXELS * 0.99);
    });
  });

  describe('fitForRendering()', () => {
    function imageFile(width: number, height: number, type: string, name: string): Promise<File> {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').fillRect(0, 0, width, height);
      return new Promise(resolve => canvas.toBlob(blob => resolve(new File([blob], name, { type })), type));
    }

    it('returns an image within the limit unchanged', async () => {
      const file = await imageFile(40, 30, 'image/png', 'small.png');
      expect(await service.fitForRendering(file)).toBe(file);
    });

    it('leaves GIFs and undecodable files alone', async () => {
      const gif = new File(['GIF89a'], 'a.gif', { type: 'image/gif' });
      const broken = new File(['nope'], 'a.jpg', { type: 'image/jpeg' });
      expect(await service.fitForRendering(gif)).toBe(gif);
      expect(await service.fitForRendering(broken)).toBe(broken);
    });

    it('scales a JPEG over the limit down to a JPEG within it', async () => {
      const file = await imageFile(5000, 4000, 'image/jpeg', 'Foto.JPG');
      const result = await service.fitForRendering(file);
      expect(result).not.toBe(file);
      expect(result.type).toBe('image/jpeg');
      expect(result.name).toBe('Foto.jpg');
      const bitmap = await createImageBitmap(result);
      expect(bitmap.width * bitmap.height).toBeLessThanOrEqual(MAX_RENDER_PIXELS);
      expect(bitmap.width / bitmap.height).toBeCloseTo(5000 / 4000, 2);
      bitmap.close();
    });
  });

  describe('fallBackToOriginal()', () => {
    it('swaps a render URL for the stored original', () => {
      const img = new Image();
      img.src = 'https://host/storage/v1/render/image/public/tde5/maps/m1/a.png?width=2000';
      StorageService.fallBackToOriginal(img);
      expect(img.src).toBe('https://host/storage/v1/object/public/tde5/maps/m1/a.png');
    });

    it('leaves the original alone, so a missing one does not loop', () => {
      const img = new Image();
      img.src = 'https://host/storage/v1/object/public/tde5/maps/m1/a.png';
      StorageService.fallBackToOriginal(img);
      expect(img.src).toBe('https://host/storage/v1/object/public/tde5/maps/m1/a.png');
    });
  });

  describe('originalURL()', () => {
    it('turns a render URL into the URL of the stored object', () => {
      expect(StorageService.originalURL(
        'https://host/storage/v1/render/image/public/tde5/people/p1/a-b.png?width=400&resize=contain&quality=80'
      )).toBe('https://host/storage/v1/object/public/tde5/people/p1/a-b.png');
    });

    it('leaves any other URL alone', () => {
      const url = 'https://host/storage/v1/object/public/tde5/people/p1/a-b.png';
      expect(StorageService.originalURL(url)).toBe(url);
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

    it('should return the stored path', async () => {
      const path = await service.uploadFile('scene.png', new Blob(['x']), 'scenes/s1');

      expect(path).toBe(uploadedPath());
      expect(path).toMatch(/^scenes\/s1\/scene-[A-Za-z0-9_]{10}\.png$/);
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

    it('should upload into a folder named after the ref entity, which the storage policies authorize', async () => {
      storedPath(null);
      const updateRef = { collection: 'people', attribute: 'image', id: 'p1' };

      await service.uploadFile('avatar.jpg', new Blob(['test']), 'images', updateRef);

      expect(uploadedPath()).toMatch(/^images\/p1\/avatar-[A-Za-z0-9_]{10}\.jpg$/);
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
