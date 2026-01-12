import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { FlowService } from './flow.service';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { DataService } from '../../core/services/data.service';
import { ConfigService } from '../../core/services/config.service';
import { QuestsService } from '../../quests/services/quests.service';
import { PeopleService } from '../../people/services/people.service';
import { PlaceService } from '../../places/services/place.service';

describe('FlowService', () => {
  let service: FlowService;
  let apiServiceSpy: jasmine.SpyObj<ApiService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let dataServiceSpy: jasmine.SpyObj<DataService>;
  let questsServiceSpy: jasmine.SpyObj<QuestsService>;
  let peopleServiceSpy: jasmine.SpyObj<PeopleService>;
  let placesServiceSpy: jasmine.SpyObj<PlaceService>;

  const mockUser = { id: 'user1', email: 'test@test.com' };
  const mockQuest = { id: 'quest1', name: 'Test Quest', description: '' };
  const mockPerson = { id: 'person1', name: 'Test Person' };
  const mockPlace = { id: 'place1', name: 'Test Place' };

  beforeEach(() => {
    const apiSpy = jasmine.createSpyObj('ApiService', ['getDataFromCollection']);
    const authSpy = jasmine.createSpyObj('AuthService', [], { user: mockUser });
    const dataSpy = jasmine.createSpyObj('DataService', ['store', 'getInitialDocumentPermissions']);
    const configSpy = jasmine.createSpyObj('ConfigService', []);
    const questsSpy = jasmine.createSpyObj('QuestsService', ['getQuests']);
    const peopleSpy = jasmine.createSpyObj('PeopleService', ['getPeople']);
    const placesSpy = jasmine.createSpyObj('PlaceService', ['getPlaces']);

    apiSpy.getDataFromCollection.and.returnValue(of([]));
    dataSpy['getInitialDocumentPermissions'] = jasmine.createSpy().and.returnValue(['user1']);
    questsSpy.getQuests.and.returnValue(of([mockQuest]));
    peopleSpy.getPeople.and.returnValue(of([mockPerson]));
    placesSpy.getPlaces.and.returnValue(of([mockPlace]));

    TestBed.configureTestingModule({
      providers: [
        FlowService,
        { provide: ApiService, useValue: apiSpy },
        { provide: AuthService, useValue: authSpy },
        { provide: DataService, useValue: dataSpy },
        { provide: ConfigService, useValue: configSpy },
        { provide: QuestsService, useValue: questsSpy },
        { provide: PeopleService, useValue: peopleSpy },
        { provide: PlaceService, useValue: placesSpy }
      ]
    });

    service = TestBed.inject(FlowService);
    apiServiceSpy = TestBed.inject(ApiService) as jasmine.SpyObj<ApiService>;
    authServiceSpy = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    dataServiceSpy = TestBed.inject(DataService) as jasmine.SpyObj<DataService>;
    questsServiceSpy = TestBed.inject(QuestsService) as jasmine.SpyObj<QuestsService>;
    peopleServiceSpy = TestBed.inject(PeopleService) as jasmine.SpyObj<PeopleService>;
    placesServiceSpy = TestBed.inject(PlaceService) as jasmine.SpyObj<PlaceService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('T-FLOW-001: should get flow for campaign', (done) => {
    service.getFlow().subscribe(flow => {
      expect(apiServiceSpy.getDataFromCollection).toHaveBeenCalled();
      done();
    });
  });

  it('T-FLOW-002: should return null when no flow exists', (done) => {
    apiServiceSpy.getDataFromCollection.and.returnValue(of([]));
    service.getFlow().subscribe(flow => {
      expect(flow).toBeNull();
      done();
    });
  });

  it('T-FLOW-003: should create new flow', async () => {
    dataServiceSpy.store.and.returnValue(Promise.resolve(true));
    const result = await service.createFlow('campaign1');
    expect(result).toBe(true);
    expect(dataServiceSpy.store).toHaveBeenCalledWith(
      jasmine.objectContaining({
        campaignId: 'campaign1',
        items: []
      }),
      'flows'
    );
  });

  it('T-FLOW-013: should enrich flow items with entity data', (done) => {
    const mockFlowData = {
      payload: {
        doc: {
          id: 'flow1',
          data: () => ({
            campaignId: 'campaign1',
            items: [
              { id: 'item1', type: 'quest', questId: 'quest1', order: 0 }
            ],
            access: ['user1']
          })
        }
      }
    };

    apiServiceSpy.getDataFromCollection.and.returnValue(of([mockFlowData]));

    service.getEnrichedFlowItems().subscribe(items => {
      expect(items.length).toBe(1);
      expect(items[0].type).toBe('quest');
      expect((items[0] as any).entity).toBeDefined();
      done();
    });
  });

  it('T-FLOW-014: should set entity to null for deleted quest', (done) => {
    const mockFlowData = {
      payload: {
        doc: {
          id: 'flow1',
          data: () => ({
            campaignId: 'campaign1',
            items: [
              { id: 'item1', type: 'quest', questId: 'deleted-quest', order: 0 }
            ],
            access: ['user1']
          })
        }
      }
    };

    apiServiceSpy.getDataFromCollection.and.returnValue(of([mockFlowData]));

    service.getEnrichedFlowItems().subscribe(items => {
      expect(items.length).toBe(1);
      expect((items[0] as any).entity).toBeNull();
      done();
    });
  });
});
