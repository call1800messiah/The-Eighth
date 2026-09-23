import { TestBed } from '@angular/core/testing';

import { ApiService } from './api.service';
import { SUPABASE_CLIENT } from '../providers/supabase.provider';
import { createMockSupabaseClient } from '../../testing/supabase-test-helpers';

describe('ApiService', () => {
  let service: ApiService;
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();

    TestBed.configureTestingModule({
      providers: [
        ApiService,
        { provide: SUPABASE_CLIENT, useValue: mockSupabase },
      ],
    });
    service = TestBed.inject(ApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('from()', () => {
    it('should delegate to supabase.from()', () => {
      service.from('people' as any);
      expect(mockSupabase.from).toHaveBeenCalledWith('people');
    });

    it('should return the query builder from supabase', () => {
      const result = service.from('notes' as any);
      expect(result).toBe(mockSupabase._queryBuilder);
    });
  });

  describe('getAuthState()', () => {
    it('should emit null when no session exists', (done) => {
      service.getAuthState().subscribe(user => {
        expect(user).toBeNull();
        done();
      });
    });

    it('should emit user when session exists', (done) => {
      const mockUser = { id: 'u1', email: 'a@b.com' };
      mockSupabase.auth.getSession.and.returnValue(
        Promise.resolve({ data: { session: { user: mockUser } }, error: null })
      );

      const svc = new ApiService(mockSupabase as any);
      svc.getAuthState().subscribe(user => {
        expect(user).toEqual(mockUser as any);
        done();
      });
    });

    it('should subscribe to onAuthStateChange', () => {
      const sub = service.getAuthState().subscribe();
      expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalled();
      sub.unsubscribe();
    });
  });

  describe('login()', () => {
    it('should call signInWithPassword with email and password', async () => {
      await service.login('user@test.com', 'pass123');
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'user@test.com',
        password: 'pass123',
      });
    });
  });

  describe('logout()', () => {
    it('should call signOut', async () => {
      await service.logout();
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });
  });

  describe('storage', () => {
    it('should return supabase.storage', () => {
      expect(service.storage).toBe(mockSupabase.storage as any);
    });
  });
});
