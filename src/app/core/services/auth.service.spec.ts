import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, Subject } from 'rxjs';

import { AuthService } from './auth.service';
import { ApiService } from './api.service';
import { UserService } from './user.service';

describe('AuthService', () => {
  let service: AuthService;
  let mockApi: any;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockUserService: any;
  let authStateSubject: Subject<any>;

  beforeEach(() => {
    authStateSubject = new Subject();

    mockApi = {
      getAuthState: jasmine.createSpy('getAuthState').and.returnValue(authStateSubject.asObservable()),
      login: jasmine.createSpy('login').and.returnValue(
        Promise.resolve({ data: {}, error: null })
      ),
      logout: jasmine.createSpy('logout').and.returnValue(
        Promise.resolve({ error: null })
      ),
    };

    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    mockUserService = {
      getUsers: jasmine.createSpy('getUsers').and.returnValue(of([
        { id: 'u1', name: 'Alice', isGM: true, viewBanner: true, viewName: true, viewTitle: true },
        { id: 'u2', name: 'Bob', isGM: false, viewBanner: false, viewName: false, viewTitle: false },
      ])),
    };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: ApiService, useValue: mockApi },
        { provide: Router, useValue: mockRouter },
        { provide: UserService, useValue: mockUserService },
      ],
    });
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('user transform', () => {
    it('should emit null when no supabase user', (done) => {
      let callCount = 0;
      service.user$.subscribe(user => {
        callCount++;
        // Skip the initial BehaviorSubject null, wait for combineLatest emission
        if (callCount === 2 && user === null) {
          expect(user).toBeNull();
          done();
        }
      });
      authStateSubject.next(null);
    });

    it('should merge supabase user with user service data', (done) => {
      service.user$.subscribe(user => {
        if (user && user.id === 'u1') {
          expect(user.email).toBe('alice@test.com');
          expect(user.name).toBe('Alice');
          expect(user.isGM).toBe(true);
          done();
        }
      });
      authStateSubject.next({ id: 'u1', email: 'alice@test.com' });
    });

    it('should set user property alongside user$ observable', (done) => {
      service.user$.subscribe(user => {
        if (user && user.id === 'u1') {
          expect(service.user).toBeTruthy();
          expect(service.user.id).toBe('u1');
          done();
        }
      });
      authStateSubject.next({ id: 'u1', email: 'alice@test.com' });
    });
  });

  describe('isLoggedIn()', () => {
    it('should return true when auth state has a user', (done) => {
      mockApi.getAuthState.and.returnValue(of({ id: 'u1' }));
      service.isLoggedIn().subscribe(loggedIn => {
        expect(loggedIn).toBe(true);
        done();
      });
    });

    it('should return false when auth state is null', (done) => {
      mockApi.getAuthState.and.returnValue(of(null));
      service.isLoggedIn().subscribe(loggedIn => {
        expect(loggedIn).toBe(false);
        done();
      });
    });
  });

  describe('login()', () => {
    it('should call api.login with credentials', () => {
      service.login('test@test.com', 'password');
      expect(mockApi.login).toHaveBeenCalledWith('test@test.com', 'password');
    });

    it('should navigate to redirectUrl on success', async () => {
      service.redirectUrl = '/overview';
      service.login('test@test.com', 'password');
      await mockApi.login.calls.mostRecent().returnValue;
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/overview']);
    });

    it('should reset redirectUrl to / after login', async () => {
      service.redirectUrl = '/custom';
      service.login('test@test.com', 'password');
      await mockApi.login.calls.mostRecent().returnValue;
      expect(service.redirectUrl).toBe('/');
    });

    it('should not navigate on login error', async () => {
      mockApi.login.and.returnValue(
        Promise.resolve({ data: null, error: { message: 'Invalid credentials' } })
      );
      service.login('bad@test.com', 'wrong');
      await mockApi.login.calls.mostRecent().returnValue;
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });
  });

  describe('logout()', () => {
    it('should call api.logout', () => {
      service.logout();
      expect(mockApi.logout).toHaveBeenCalled();
    });

    it('should navigate to auth page after logout', async () => {
      service.logout();
      await mockApi.logout.calls.mostRecent().returnValue;
      expect(mockRouter.navigate).toHaveBeenCalledWith(['auth']);
    });
  });
});
