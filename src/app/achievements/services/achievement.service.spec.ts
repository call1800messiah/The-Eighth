import { TestBed } from '@angular/core/testing';
import { of, BehaviorSubject } from 'rxjs';

import { AchievementService } from './achievement.service';
import { DataService } from '../../core/services/data.service';
import { PeopleService } from '../../people/services/people.service';
import { RealtimeService } from '../../core/services/supabase-realtime.service';
import { createMockDataService, createMockRealtimeService } from '../../testing/supabase-test-helpers';

describe('AchievementService', () => {
  let service: AchievementService;
  let mockData: ReturnType<typeof createMockDataService>;
  let mockRealtime: ReturnType<typeof createMockRealtimeService>;
  let mockPeople: any;
  let people$: BehaviorSubject<any[]>;

  const mockPeopleList = [
    { id: 'person1', name: 'Alice' },
    { id: 'person2', name: 'Bob' },
    { id: 'person3', name: 'Carol' },
  ];

  beforeEach(() => {
    mockData = createMockDataService();
    mockRealtime = createMockRealtimeService();
    people$ = new BehaviorSubject(mockPeopleList);
    mockPeople = {
      getPeople: jasmine.createSpy('getPeople').and.returnValue(people$),
    };

    TestBed.configureTestingModule({
      providers: [
        AchievementService,
        { provide: DataService, useValue: mockData },
        { provide: PeopleService, useValue: mockPeople },
        { provide: RealtimeService, useValue: mockRealtime },
      ],
    });
    service = TestBed.inject(AchievementService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getAchievements()', () => {
    it('should call realtime.watch for achievements table with people join', () => {
      service.getAchievements().subscribe();
      expect(mockRealtime.watch).toHaveBeenCalledWith(
        'achievements',
        jasmine.any(Function),
        'achievements',
      );
    });

    it('should transform achievement rows with junction table data', (done) => {
      service.getAchievements().subscribe(achievements => {
        expect(achievements.length).toBe(1);
        expect(achievements[0]).toEqual(jasmine.objectContaining({
          id: 'a1',
          name: 'First Blood',
          description: 'Win first combat',
          icon: 'sword',
          owner: 'u1',
          collection: 'achievements',
        }));
        expect(achievements[0].unlocked instanceof Date).toBe(true);
        done();
      });

      mockRealtime.emitRows('achievements', [{
        id: 'a1',
        name: 'First Blood',
        description: 'Win first combat',
        unlocked: '2024-06-01T00:00:00Z',
        icon: 'sword',
        owner_id: 'u1',
        achievement_people: [],
      }]);
    });

    it('should resolve people from junction table', (done) => {
      service.getAchievements().subscribe(achievements => {
        expect(achievements[0].people.length).toBe(2);
        expect(achievements[0].people[0].name).toBe('Alice');
        expect(achievements[0].people[1].name).toBe('Bob');
        done();
      });

      mockRealtime.emitRows('achievements', [{
        id: 'a1', name: 'Team Kill', description: '', unlocked: '2024-01-01T00:00:00Z',
        icon: '', owner_id: 'u1',
        achievement_people: [{ person_id: 'person1' }, { person_id: 'person2' }],
      }]);
    });

    it('should filter out people not found in people list', (done) => {
      service.getAchievements().subscribe(achievements => {
        expect(achievements[0].people.length).toBe(1);
        expect(achievements[0].people[0].name).toBe('Alice');
        done();
      });

      mockRealtime.emitRows('achievements', [{
        id: 'a1', name: 'Solo', description: '', unlocked: '2024-01-01T00:00:00Z',
        icon: '', owner_id: 'u1',
        achievement_people: [{ person_id: 'person1' }, { person_id: 'deleted-person' }],
      }]);
    });

    it('should handle null achievement_people', (done) => {
      service.getAchievements().subscribe(achievements => {
        expect(achievements[0].people.length).toBe(0);
        done();
      });

      mockRealtime.emitRows('achievements', [{
        id: 'a1', name: 'Test', description: '', unlocked: '2024-01-01T00:00:00Z',
        icon: '', owner_id: 'u1', achievement_people: null,
      }]);
    });
  });

  describe('store()', () => {
    it('should delegate to DataService.store', async () => {
      await service.store({ name: 'New' } as any, 'a1');
      expect(mockData.store).toHaveBeenCalledWith({ name: 'New' }, 'achievements', 'a1');
    });
  });
});
