import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';

import { PeopleService } from './people.service';
import { ApiService } from '../../core/services/api.service';
import { DataService } from '../../core/services/data.service';
import { PlaceService } from '../../places/services/place.service';
import { RulesService } from '../../rules/services/rules.service';
import { StorageService } from '../../core/services/storage.service';
import { RealtimeService } from '../../core/services/supabase-realtime.service';
import {
  createMockApiService,
  createMockDataService,
  createMockRealtimeService,
  createMockStorageService,
} from '../../testing/supabase-test-helpers';

describe('PeopleService', () => {
  let service: PeopleService;
  let mockApi: ReturnType<typeof createMockApiService>;
  let mockData: ReturnType<typeof createMockDataService>;
  let mockRealtime: ReturnType<typeof createMockRealtimeService>;
  let mockStorage: ReturnType<typeof createMockStorageService>;
  let mockPlaces: any;
  let mockRules: any;
  let places$: BehaviorSubject<any[]>;
  let rules$: BehaviorSubject<any[]>;

  const mockPlacesList = [
    { id: 'loc1', name: 'Gareth' },
    { id: 'loc2', name: 'Havena' },
  ];

  const mockRulesList = [
    { id: 'adv1', name: 'Lucky', type: 'advantage' },
    { id: 'dis1', name: 'Unlucky', type: 'disadvantage' },
    { id: 'skill1', name: 'Climbing', type: 'skill', attributeOne: 'MU', attributeTwo: 'GE', attributeThree: 'KK' },
    { id: 'spell1', name: 'Fireball', type: 'spell', attributeOne: 'KL', attributeTwo: 'IN', attributeThree: 'CH' },
    { id: 'feat1', name: 'Combat Reflexes', type: 'feat' },
    { id: 'cantrip1', name: 'Light', type: 'cantrip' },
    { id: 'liturgy1', name: 'Blessing', type: 'liturgy', attributeOne: 'MU', attributeTwo: 'IN', attributeThree: 'CH' },
  ];

  beforeEach(() => {
    mockApi = createMockApiService();
    mockData = createMockDataService();
    mockRealtime = createMockRealtimeService();
    mockStorage = createMockStorageService();
    places$ = new BehaviorSubject(mockPlacesList);
    rules$ = new BehaviorSubject(mockRulesList);
    mockPlaces = {
      getPlaces: jasmine.createSpy('getPlaces').and.returnValue(places$),
    };
    mockRules = {
      getDynamicRules: jasmine.createSpy('getDynamicRules').and.returnValue(rules$),
      getRulesConfig: jasmine.createSpy('getRulesConfig').and.returnValue(
        Promise.resolve({ edition: 5, allowedAttributes: [] })
      ),
    };

    TestBed.configureTestingModule({
      providers: [
        PeopleService,
        { provide: ApiService, useValue: mockApi },
        { provide: DataService, useValue: mockData },
        { provide: PlaceService, useValue: mockPlaces },
        { provide: RulesService, useValue: mockRules },
        { provide: StorageService, useValue: mockStorage },
        { provide: RealtimeService, useValue: mockRealtime },
      ],
    });
    service = TestBed.inject(PeopleService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  function emitPeople(rows: any[]) {
    mockRealtime.emitRows('people', rows);
  }

  function basePerson(overrides: any = {}) {
    return {
      id: 'per1', name: 'Alice', owner_id: 'u1', pc: true,
      birthday: null, birthyear: null, culture: null, deathday: null,
      height: null, profession: null, race: null, title: null, xp: 0,
      image: '', banner: '', location_id: null,
      person_advantages: [], person_cantrips: [], person_disadvantages: [],
      person_feats: [], person_liturgies: [], person_skills: [],
      person_spells: [], person_attributes: [], person_tags: [],
      person_relationships: [],
      ...overrides,
    };
  }

  describe('getPeople()', () => {
    it('should call realtime.watch for people table with joins', () => {
      service.getPeople().subscribe();
      expect(mockRealtime.watch).toHaveBeenCalledWith(
        'people',
        jasmine.any(Function),
        'people',
      );
    });

    it('should transform basic person fields', (done) => {
      service.getPeople().subscribe(people => {
        if (people.length === 0) return;
        expect(people[0]).toEqual(jasmine.objectContaining({
          id: 'per1',
          name: 'Alice',
          owner: 'u1',
          pc: true,
          collection: 'people',
          xp: 100,
        }));
        expect(people[0].access).toEqual([]);
        done();
      });

      emitPeople([basePerson({ xp: 100 })]);
    });

    it('should resolve advantages from junction table', (done) => {
      service.getPeople().subscribe(people => {
        if (people.length === 0) return;
        expect(people[0].advantages.length).toBe(1);
        expect(people[0].advantages[0]).toEqual(jasmine.objectContaining({
          id: 'adv1', name: 'Lucky',
        }));
        done();
      });

      emitPeople([basePerson({
        person_advantages: [{ rule_id: 'adv1', level: 'II', details: 'test' }],
      })]);
    });

    it('should include level and details on advantages', (done) => {
      service.getPeople().subscribe(people => {
        if (people.length === 0) return;
        expect(people[0].advantages[0].level).toBe('II');
        expect(people[0].advantages[0].details).toBe('test');
        done();
      });

      emitPeople([basePerson({
        person_advantages: [{ rule_id: 'adv1', level: 'II', details: 'test' }],
      })]);
    });

    it('should resolve disadvantages from junction table', (done) => {
      service.getPeople().subscribe(people => {
        if (people.length === 0) return;
        expect(people[0].disadvantages.length).toBe(1);
        expect(people[0].disadvantages[0].name).toBe('Unlucky');
        done();
      });

      emitPeople([basePerson({
        person_disadvantages: [{ rule_id: 'dis1', level: 1, details: null }],
      })]);
    });

    it('should resolve skills with attribute mappings', (done) => {
      service.getPeople().subscribe(people => {
        if (people.length === 0) return;
        expect(people[0].skills.length).toBe(1);
        expect(people[0].skills[0]).toEqual(jasmine.objectContaining({
          id: 'skill1',
          name: 'Climbing',
          value: 8,
          attributeOne: 'MU',
          attributeTwo: 'GE',
          attributeThree: 'KK',
        }));
        done();
      });

      emitPeople([basePerson({
        person_skills: [{ rule_id: 'skill1', value: 8 }],
      })]);
    });

    it('should resolve spells with attribute mappings', (done) => {
      service.getPeople().subscribe(people => {
        if (people.length === 0) return;
        expect(people[0].spells.length).toBe(1);
        expect(people[0].spells[0].name).toBe('Fireball');
        expect(people[0].spells[0].value).toBe(12);
        done();
      });

      emitPeople([basePerson({
        person_spells: [{ rule_id: 'spell1', value: 12 }],
      })]);
    });

    it('should resolve feats from junction table', (done) => {
      service.getPeople().subscribe(people => {
        if (people.length === 0) return;
        expect(people[0].feats.length).toBe(1);
        expect(people[0].feats[0].name).toBe('Combat Reflexes');
        done();
      });

      emitPeople([basePerson({
        person_feats: [{ rule_id: 'feat1', level: null, details: null }],
      })]);
    });

    it('should resolve cantrips from junction table', (done) => {
      service.getPeople().subscribe(people => {
        if (people.length === 0) return;
        expect(people[0].cantrips.length).toBe(1);
        expect(people[0].cantrips[0].name).toBe('Light');
        done();
      });

      emitPeople([basePerson({
        person_cantrips: [{ rule_id: 'cantrip1', value: 0 }],
      })]);
    });

    it('should resolve liturgies from junction table', (done) => {
      service.getPeople().subscribe(people => {
        if (people.length === 0) return;
        expect(people[0].liturgys.length).toBe(1);
        expect(people[0].liturgys[0].name).toBe('Blessing');
        expect(people[0].liturgys[0].value).toBe(5);
        done();
      });

      emitPeople([basePerson({
        person_liturgies: [{ rule_id: 'liturgy1', value: 5 }],
      })]);
    });

    it('should transform person_tags to tags array', (done) => {
      service.getPeople().subscribe(people => {
        if (people.length === 0) return;
        expect(people[0].tags).toEqual(['hero', 'mage']);
        done();
      });

      emitPeople([basePerson({
        person_tags: [{ tag: 'hero' }, { tag: 'mage' }],
      })]);
    });

    it('should transform person_attributes', (done) => {
      service.getPeople().subscribe(people => {
        if (people.length === 0) return;
        expect(people[0].attributes.length).toBe(1);
        expect(people[0].attributes[0]).toEqual({
          type: 'lep', current: 28, max: 30,
        });
        done();
      });

      emitPeople([basePerson({
        person_attributes: [{ type: 'lep', current: 28, max: 30 }],
      })]);
    });

    it('should resolve relationships from junction table', (done) => {
      service.getPeople().subscribe(people => {
        if (people.length === 0) return;
        const alice = people.find(p => p.id === 'per1');
        expect(alice.relatives['partners']).toBeDefined();
        expect(alice.relatives['partners'].length).toBe(1);
        done();
      });

      emitPeople([
        basePerson({
          id: 'per1', name: 'Alice',
          person_relationships: [{ related_person_id: 'per2', relationship_type: 'partners' }],
        }),
        basePerson({ id: 'per2', name: 'Bob', person_relationships: [] }),
      ]);
    });

    it('should resolve relative names from people list', (done) => {
      service.getPeople().subscribe(people => {
        if (people.length === 0) return;
        const alice = people.find(p => p.id === 'per1');
        expect(alice.relatives['partners'][0].name).toBe('Bob');
        done();
      });

      emitPeople([
        basePerson({
          id: 'per1', name: 'Alice',
          person_relationships: [{ related_person_id: 'per2', relationship_type: 'partners' }],
        }),
        basePerson({ id: 'per2', name: 'Bob', person_relationships: [] }),
      ]);
    });

    it('should resolve location from places', (done) => {
      service.getPeople().subscribe(people => {
        if (people.length === 0) return;
        expect(people[0].location).toBeDefined();
        expect(people[0].location.name).toBe('Gareth');
        expect(people[0].location.id).toBe('loc1');
        done();
      });

      emitPeople([basePerson({ location_id: 'loc1' })]);
    });

    it('should resolve image URLs via StorageService', (done) => {
      service.getPeople().subscribe(people => {
        if (people.length === 0) return;
        expect(mockStorage.getDownloadURL).toHaveBeenCalledWith('images/alice.jpg');
        done();
      });

      emitPeople([basePerson({ image: 'images/alice.jpg' })]);
    });

    it('should sort people by name', (done) => {
      service.getPeople().subscribe(people => {
        if (people.length === 0) return;
        expect(people[0].name).toBe('Alice');
        expect(people[1].name).toBe('Bob');
        done();
      });

      emitPeople([
        basePerson({ id: 'per2', name: 'Bob' }),
        basePerson({ id: 'per1', name: 'Alice' }),
      ]);
    });

    it('should skip rules not found in dynamic rules list', (done) => {
      service.getPeople().subscribe(people => {
        if (people.length === 0) return;
        expect(people[0].advantages.length).toBe(0);
        done();
      });

      emitPeople([basePerson({
        person_advantages: [{ rule_id: 'nonexistent', level: 1, details: null }],
      })]);
    });

    it('should return the same observable on subsequent calls', () => {
      const obs1 = service.getPeople();
      const obs2 = service.getPeople();
      expect(obs1).toBe(obs2);
    });
  });

  describe('store()', () => {
    it('should delegate to DataService.store', async () => {
      await service.store({ name: 'Updated' }, 'per1');
      expect(mockData.store).toHaveBeenCalledWith({ name: 'Updated' }, 'people', 'per1');
    });
  });

  describe('getPersonById()', () => {
    it('should return a specific person by id', (done) => {
      service.getPersonById('per2').subscribe(person => {
        if (!person) return;
        expect(person.id).toBe('per2');
        expect(person.name).toBe('Bob');
        done();
      });

      emitPeople([
        basePerson({ id: 'per1', name: 'Alice' }),
        basePerson({ id: 'per2', name: 'Bob' }),
      ]);
    });
  });

  describe('updateAttribute()', () => {
    it('should upsert person attribute', async () => {
      const result = await service.updateAttribute('per1', { type: 'lep', current: 25, max: 30 });
      expect(mockApi.from).toHaveBeenCalledWith('person_attributes');
      expect(result).toBe(true);
    });
  });

  describe('deleteAttribute()', () => {
    it('should delete person attribute by type', async () => {
      const result = await service.deleteAttribute('per1', 'lep');
      expect(mockApi.from).toHaveBeenCalledWith('person_attributes');
      expect(mockApi._queryBuilder.delete).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });
});
