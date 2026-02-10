import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';

import { CombatService } from './combat.service';
import { ApiService } from '../../core/services/api.service';
import { PeopleService } from '../../people/services/people.service';
import { RulesService } from '../../rules/services/rules.service';
import { RealtimeService } from '../../core/services/supabase-realtime.service';
import {
  createMockApiService,
  createMockRealtimeService,
} from '../../testing/supabase-test-helpers';

describe('CombatService', () => {
  let service: CombatService;
  let mockApi: ReturnType<typeof createMockApiService>;
  let mockRealtime: ReturnType<typeof createMockRealtimeService>;
  let mockPeople: any;
  let people$: BehaviorSubject<any[]>;

  const mockPeopleList = [
    { id: 'p1', name: 'Alice', attributes: [{ type: 'lep', current: 30, max: 30 }] },
    { id: 'p2', name: 'Bob', attributes: [] },
  ];

  beforeEach(() => {
    mockApi = createMockApiService();
    mockRealtime = createMockRealtimeService();
    people$ = new BehaviorSubject(mockPeopleList);
    mockPeople = {
      getPeople: jasmine.createSpy('getPeople').and.returnValue(people$),
    };
    const mockRules = {
      getRulesConfig: jasmine.createSpy('getRulesConfig').and.returnValue(
        Promise.resolve({ edition: 5, allowedAttributes: [{ shortCode: 'lep' }] })
      ),
    };

    TestBed.configureTestingModule({
      providers: [
        CombatService,
        { provide: ApiService, useValue: mockApi },
        { provide: PeopleService, useValue: mockPeople },
        { provide: RealtimeService, useValue: mockRealtime },
        { provide: RulesService, useValue: mockRules },
      ],
    });
    service = TestBed.inject(CombatService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getCombatants()', () => {
    it('should call realtime.watch for combatants table', () => {
      service.getCombatants().subscribe();
      expect(mockRealtime.watch).toHaveBeenCalledWith(
        'combatants',
        jasmine.any(Function),
        'combatants',
      );
    });

    it('should transform combatant rows and link to people', (done) => {
      service.getCombatants().subscribe(combatants => {
        expect(combatants.length).toBe(1);
        expect(combatants[0].person).toBeDefined();
        expect(combatants[0].person.name).toBe('Alice');
        expect(combatants[0].active).toBe(true);
        expect(combatants[0].initiative).toBe(15);
        done();
      });

      mockRealtime.emitRows('combatants', [{
        id: 'c1', person_id: 'p1', name: null, active: true, initiative: 15,
        combatant_attributes: [], combatant_states: [],
      }]);
    });

    it('should transform combatant attributes', (done) => {
      service.getCombatants().subscribe(combatants => {
        expect(combatants.length).toBe(1);
        // attributes is an Observable, subscribe to it
        combatants[0].attributes.subscribe(attrs => {
          // When person is linked, uses person attributes
          expect(attrs).toBeDefined();
          done();
        });
      });

      mockRealtime.emitRows('combatants', [{
        id: 'c1', person_id: 'p1', name: null, active: true, initiative: 10,
        combatant_attributes: [{ type: 'lep', current: 25, max: 30 }],
        combatant_states: [],
      }]);
    });

    it('should transform combatant states with name mapping', (done) => {
      service.getCombatants().subscribe(combatants => {
        expect(combatants[0].states).toBeDefined();
        expect(combatants[0].states.length).toBe(1);
        expect(combatants[0].states[0].name).toBe('stunned');
        expect(combatants[0].states[0].modifiers).toEqual([]);
        done();
      });

      mockRealtime.emitRows('combatants', [{
        id: 'c1', person_id: null, name: 'Goblin', active: true, initiative: 5,
        combatant_attributes: [],
        combatant_states: [{ state: 'stunned' }],
      }]);
    });

    it('should sort by active first, then by initiative descending', (done) => {
      service.getCombatants().subscribe(combatants => {
        expect(combatants.length).toBe(3);
        expect(combatants[0].name).toBe('Active High');
        expect(combatants[1].name).toBe('Active Low');
        expect(combatants[2].name).toBe('Inactive');
        done();
      });

      mockRealtime.emitRows('combatants', [
        { id: 'c1', person_id: null, name: 'Active Low', active: true, initiative: 5, combatant_attributes: [], combatant_states: [] },
        { id: 'c2', person_id: null, name: 'Inactive', active: false, initiative: 20, combatant_attributes: [], combatant_states: [] },
        { id: 'c3', person_id: null, name: 'Active High', active: true, initiative: 15, combatant_attributes: [], combatant_states: [] },
      ]);
    });

    it('should handle named combatants without person link', (done) => {
      service.getCombatants().subscribe(combatants => {
        expect(combatants[0].name).toBe('Goblin');
        expect(combatants[0].person).toBeUndefined();
        done();
      });

      mockRealtime.emitRows('combatants', [{
        id: 'c1', person_id: null, name: 'Goblin', active: true, initiative: 10,
        combatant_attributes: [], combatant_states: [],
      }]);
    });
  });

  describe('getIdsOfPeopleInFight()', () => {
    it('should return IDs of people linked to combatants', (done) => {
      service.getIdsOfPeopleInFight().subscribe(ids => {
        expect(ids).toEqual(['p1']);
        done();
      });

      mockRealtime.emitRows('combatants', [
        { id: 'c1', person_id: 'p1', name: null, active: true, initiative: 10, combatant_attributes: [], combatant_states: [] },
        { id: 'c2', person_id: null, name: 'Goblin', active: true, initiative: 5, combatant_attributes: [], combatant_states: [] },
      ]);
    });
  });

  describe('setStates()', () => {
    it('should delete existing states and insert new ones', async () => {
      await service.setStates('c1', [{ name: 'prone', modifiers: [] }]);
      // First call deletes, second inserts
      expect(mockApi.from).toHaveBeenCalledWith('combatant_states');
    });

    it('should only delete when states array is empty', async () => {
      await service.setStates('c1', []);
      expect(mockApi.from).toHaveBeenCalledWith('combatant_states');
      expect(mockApi._queryBuilder.delete).toHaveBeenCalled();
    });
  });
});
