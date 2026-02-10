import { TestBed } from '@angular/core/testing';

import { PlaceService } from './place.service';
import { DataService } from '../../core/services/data.service';
import { RealtimeService } from '../../core/services/supabase-realtime.service';
import { StorageService } from '../../core/services/storage.service';
import { createMockDataService, createMockRealtimeService, createMockStorageService } from '../../testing/supabase-test-helpers';

describe('PlaceService', () => {
  let service: PlaceService;
  let mockData: ReturnType<typeof createMockDataService>;
  let mockRealtime: ReturnType<typeof createMockRealtimeService>;
  let mockStorage: ReturnType<typeof createMockStorageService>;

  beforeEach(() => {
    mockData = createMockDataService();
    mockRealtime = createMockRealtimeService();
    mockStorage = createMockStorageService();

    TestBed.configureTestingModule({
      providers: [
        PlaceService,
        { provide: DataService, useValue: mockData },
        { provide: RealtimeService, useValue: mockRealtime },
        { provide: StorageService, useValue: mockStorage },
      ],
    });
    service = TestBed.inject(PlaceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getPlaces()', () => {
    it('should call realtime.watch for places table', () => {
      service.getPlaces().subscribe();
      expect(mockRealtime.watch).toHaveBeenCalledWith('places', undefined, 'places');
    });

    it('should transform DB rows to Place objects', (done) => {
      service.getPlaces().subscribe(places => {
        if (places.length === 0) return;
        expect(places[0]).toEqual(jasmine.objectContaining({
          id: 'p1',
          name: 'Gareth',
          type: 'city',
          inhabitants: 30000,
          owner: 'u1',
          collection: 'places',
        }));
        expect(places[0].access).toEqual([]);
        done();
      });

      mockRealtime.emitRows('places', [{
        id: 'p1', name: 'Gareth', type: 'city', inhabitants: 30000,
        owner_id: 'u1', parent_id: null, image: '',
      }]);
    });

    it('should resolve parent names', (done) => {
      service.getPlaces().subscribe(places => {
        if (places.length === 0) return;
        const child = places.find(p => p.id === 'p2');
        expect(child.parent).toBeDefined();
        expect(child.parent.name).toBe('Gareth');
        done();
      });

      mockRealtime.emitRows('places', [
        { id: 'p1', name: 'Gareth', type: 'city', inhabitants: 30000, owner_id: 'u1', parent_id: null, image: '' },
        { id: 'p2', name: 'Market Square', type: 'place', inhabitants: 0, owner_id: 'u1', parent_id: 'p1', image: '' },
      ]);
    });

    it('should build place tree with parts', (done) => {
      service.getPlaces().subscribe(places => {
        if (places.length === 0) return;
        const parent = places.find(p => p.id === 'p1');
        expect(parent.parts).toBeDefined();
        expect(parent.parts.length).toBe(1);
        expect(parent.parts[0].id).toBe('p2');
        done();
      });

      mockRealtime.emitRows('places', [
        { id: 'p1', name: 'Gareth', type: 'city', inhabitants: 30000, owner_id: 'u1', parent_id: null, image: '' },
        { id: 'p2', name: 'Market', type: 'place', inhabitants: 0, owner_id: 'u1', parent_id: 'p1', image: '' },
      ]);
    });

    it('should resolve image URL when image path is set', (done) => {
      service.getPlaces().subscribe(places => {
        if (places.length === 0) return;
        expect(mockStorage.getDownloadURL).toHaveBeenCalledWith('places/gareth.jpg');
        done();
      });

      mockRealtime.emitRows('places', [{
        id: 'p1', name: 'Gareth', type: 'city', inhabitants: 0,
        owner_id: 'u1', parent_id: null, image: 'places/gareth.jpg',
      }]);
    });

    it('should sort places by name', (done) => {
      service.getPlaces().subscribe(places => {
        if (places.length === 0) return;
        expect(places[0].name).toBe('Alpha');
        expect(places[1].name).toBe('Beta');
        done();
      });

      mockRealtime.emitRows('places', [
        { id: 'p2', name: 'Beta', type: 'city', inhabitants: 0, owner_id: 'u1', parent_id: null, image: '' },
        { id: 'p1', name: 'Alpha', type: 'city', inhabitants: 0, owner_id: 'u1', parent_id: null, image: '' },
      ]);
    });
  });

  describe('store()', () => {
    it('should map parent to parent_id and clean fields', async () => {
      await service.store({
        name: 'Place',
        parent: { id: 'p1', name: 'Parent' },
        parts: [],
        image: 'url',
      } as any, 'p2');

      const storedItem = mockData.store.calls.mostRecent().args[0];
      expect(storedItem.parent_id).toBe('p1');
      expect(storedItem.parent).toBeUndefined();
      expect(storedItem.parts).toBeUndefined();
      expect(storedItem.image).toBeUndefined();
    });
  });

  describe('getPlaceById()', () => {
    it('should return a specific place by id', (done) => {
      service.getPlaceById('p2').subscribe(place => {
        if (!place) return;
        expect(place.id).toBe('p2');
        expect(place.name).toBe('Market');
        done();
      });

      mockRealtime.emitRows('places', [
        { id: 'p1', name: 'City', type: 'city', inhabitants: 0, owner_id: 'u1', parent_id: null, image: '' },
        { id: 'p2', name: 'Market', type: 'place', inhabitants: 0, owner_id: 'u1', parent_id: null, image: '' },
      ]);
    });
  });

  describe('getPlaceInfos()', () => {
    it('should delegate to DataService.getInfos', () => {
      service.getPlaceInfos('p1');
      expect(mockData.getInfos).toHaveBeenCalledWith('p1', 'places');
    });
  });
});
