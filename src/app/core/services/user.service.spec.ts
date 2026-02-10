import { TestBed } from '@angular/core/testing';

import { UserService } from './user.service';
import { RealtimeService } from './supabase-realtime.service';
import { createMockRealtimeService } from '../../testing/supabase-test-helpers';

describe('UserService', () => {
  let service: UserService;
  let mockRealtime: ReturnType<typeof createMockRealtimeService>;

  beforeEach(() => {
    mockRealtime = createMockRealtimeService();

    TestBed.configureTestingModule({
      providers: [
        UserService,
        { provide: RealtimeService, useValue: mockRealtime },
      ],
    });
    service = TestBed.inject(UserService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getUsers()', () => {
    it('should call realtime.watch with users table and role join', () => {
      service.getUsers().subscribe();
      expect(mockRealtime.watch).toHaveBeenCalledWith(
        'users',
        jasmine.any(Function),
        'users',
      );
    });

    it('should transform snake_case DB rows to camelCase User objects', (done) => {
      service.getUsers().subscribe(users => {
        expect(users.length).toBe(1);
        expect(users[0]).toEqual({
          id: 'u1',
          name: 'Alice',
          isGM: true,
          viewBanner: true,
          viewName: false,
          viewTitle: true,
        });
        done();
      });

      mockRealtime.emitRows('users', [{
        id: 'u1',
        name: 'Alice',
        view_banner: true,
        view_name: false,
        view_title: true,
        user_roles: [{ role: 'gm' }],
      }]);
    });

    it('should set isGM to false when user has no gm role', (done) => {
      service.getUsers().subscribe(users => {
        expect(users[0].isGM).toBe(false);
        done();
      });

      mockRealtime.emitRows('users', [{
        id: 'u2',
        name: 'Bob',
        view_banner: false,
        view_name: true,
        view_title: false,
        user_roles: [{ role: 'player' }],
      }]);
    });

    it('should set isGM to false when user_roles is null', (done) => {
      service.getUsers().subscribe(users => {
        expect(users[0].isGM).toBe(false);
        done();
      });

      mockRealtime.emitRows('users', [{
        id: 'u3',
        name: 'Carol',
        view_banner: false,
        view_name: false,
        view_title: false,
        user_roles: null,
      }]);
    });

    it('should return the same observable on subsequent calls', () => {
      const obs1 = service.getUsers();
      const obs2 = service.getUsers();
      expect(obs1).toBe(obs2);
    });

    it('should handle multiple users', (done) => {
      service.getUsers().subscribe(users => {
        expect(users.length).toBe(2);
        expect(users[0].name).toBe('Alice');
        expect(users[1].name).toBe('Bob');
        done();
      });

      mockRealtime.emitRows('users', [
        { id: 'u1', name: 'Alice', view_banner: true, view_name: true, view_title: true, user_roles: [] },
        { id: 'u2', name: 'Bob', view_banner: false, view_name: false, view_title: false, user_roles: [] },
      ]);
    });
  });
});
