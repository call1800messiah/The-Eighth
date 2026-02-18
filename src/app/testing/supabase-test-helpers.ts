import { of, Observable, Subject, BehaviorSubject, EMPTY } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from '../core/services/auth.service';
import { ApiService } from '../core/services/api.service';
import { DataService } from '../core/services/data.service';
import { StorageService } from '../core/services/storage.service';
import { NavigationService } from '../core/services/navigation.service';
import { PopoverService } from '../core/services/popover.service';
import { UserService } from '../core/services/user.service';
import { UtilService } from '../core/services/util.service';
import { PeopleService } from '../people/services/people.service';
import { PlaceService } from '../places/services/place.service';
import { QuestsService } from '../quests/services/quests.service';
import { ProjectService } from '../projects/services/project.service';
import { CombatService } from '../combat/services/combat.service';
import { AchievementService } from '../achievements/services/achievement.service';
import { InventoryService } from '../inventory/services/inventory.service';
import { NotesService } from '../notes/services/notes.service';
import { RulesService } from '../rules/services/rules.service';
import { DiceRollerService } from '../dice/services/dice-roller.service';
import { CampaignService } from '../overview/services/campaign.service';
import { TimelineService } from '../overview/services/timeline.service';

/**
 * Creates a chainable mock Supabase query builder.
 * Each method returns the builder itself so `.from().select().eq().single()` works.
 */
export function createMockQueryBuilder(overrides?: {
  data?: any;
  error?: any;
}) {
  const result = { data: overrides?.data ?? null, error: overrides?.error ?? null };

  const builder: any = {
    select: jasmine.createSpy('select').and.callFake(() => builder),
    insert: jasmine.createSpy('insert').and.callFake(() => builder),
    update: jasmine.createSpy('update').and.callFake(() => builder),
    upsert: jasmine.createSpy('upsert').and.callFake(() => builder),
    delete: jasmine.createSpy('delete').and.callFake(() => builder),
    eq: jasmine.createSpy('eq').and.callFake(() => builder),
    neq: jasmine.createSpy('neq').and.callFake(() => builder),
    in: jasmine.createSpy('in').and.callFake(() => builder),
    order: jasmine.createSpy('order').and.callFake(() => builder),
    limit: jasmine.createSpy('limit').and.callFake(() => builder),
    single: jasmine.createSpy('single').and.callFake(() => builder),
    // PromiseLike support
    then: jasmine.createSpy('then').and.callFake((resolve: any) => {
      return Promise.resolve(result).then(resolve);
    }),
  };

  return builder;
}


/**
 * Creates a mock SupabaseClient for use in core service specs.
 */
export function createMockSupabaseClient() {
  const queryBuilder = createMockQueryBuilder();

  const authSubject = new Subject<any>();
  const mockSubscription = { unsubscribe: jasmine.createSpy('unsubscribe') };

  return {
    from: jasmine.createSpy('from').and.returnValue(queryBuilder),
    auth: {
      getSession: jasmine.createSpy('getSession').and.returnValue(
        Promise.resolve({ data: { session: null }, error: null })
      ),
      onAuthStateChange: jasmine.createSpy('onAuthStateChange').and.returnValue({
        data: { subscription: mockSubscription },
      }),
      signInWithPassword: jasmine.createSpy('signInWithPassword').and.returnValue(
        Promise.resolve({ data: {}, error: null })
      ),
      signOut: jasmine.createSpy('signOut').and.returnValue(
        Promise.resolve({ error: null })
      ),
    },
    storage: {
      from: jasmine.createSpy('storageFrom').and.returnValue({
        upload: jasmine.createSpy('upload').and.returnValue(
          Promise.resolve({ data: {}, error: null })
        ),
        remove: jasmine.createSpy('remove').and.returnValue(
          Promise.resolve({ data: {}, error: null })
        ),
        getPublicUrl: jasmine.createSpy('getPublicUrl').and.returnValue({
          data: { publicUrl: 'https://example.com/file.jpg' },
        }),
        list: jasmine.createSpy('list').and.returnValue(
          Promise.resolve({ data: [], error: null })
        ),
      }),
    },
    channel: jasmine.createSpy('channel').and.returnValue({
      on: jasmine.createSpy('on').and.returnValue({
        subscribe: jasmine.createSpy('subscribe').and.returnValue({}),
      }),
      subscribe: jasmine.createSpy('subscribe'),
    }),
    removeChannel: jasmine.createSpy('removeChannel'),
    _queryBuilder: queryBuilder,
    _authSubject: authSubject,
  };
}


/**
 * Creates a mock ApiService for feature service specs.
 */
export function createMockApiService() {
  const queryBuilder = createMockQueryBuilder();

  return {
    from: jasmine.createSpy('from').and.returnValue(queryBuilder),
    getAuthState: jasmine.createSpy('getAuthState').and.returnValue(of(null)),
    login: jasmine.createSpy('login').and.returnValue(
      Promise.resolve({ data: {}, error: null })
    ),
    logout: jasmine.createSpy('logout').and.returnValue(
      Promise.resolve({ error: null })
    ),
    storage: {
      from: jasmine.createSpy('storageFrom').and.returnValue({
        upload: jasmine.createSpy('upload').and.returnValue(
          Promise.resolve({ data: {}, error: null })
        ),
        remove: jasmine.createSpy('remove').and.returnValue(
          Promise.resolve({ data: {}, error: null })
        ),
        getPublicUrl: jasmine.createSpy('getPublicUrl').and.returnValue({
          data: { publicUrl: 'https://example.com/file.jpg' },
        }),
        list: jasmine.createSpy('list').and.returnValue(
          Promise.resolve({ data: [], error: null })
        ),
      }),
    },
    _queryBuilder: queryBuilder,
  };
}


/**
 * Creates a mock RealtimeService for feature service specs.
 * Use `emitRows()` on the returned mock to push data to `watch()` subscribers.
 */
export function createMockRealtimeService() {
  const watchSubjects: Record<string, Subject<any[]>> = {};
  const watchOneSubjects: Record<string, Subject<any>> = {};

  const mock = {
    watch: jasmine.createSpy('watch').and.callFake(
      (_table: string, _queryFn?: any, cacheKey?: string) => {
        const key = cacheKey ?? _table;
        if (!watchSubjects[key]) {
          watchSubjects[key] = new Subject<any[]>();
        }
        return watchSubjects[key].asObservable();
      }
    ),
    watchOne: jasmine.createSpy('watchOne').and.callFake(
      (_table: string, id: string) => {
        const key = `${_table}:${id}`;
        if (!watchOneSubjects[key]) {
          watchOneSubjects[key] = new Subject<any>();
        }
        return watchOneSubjects[key].asObservable();
      }
    ),
    /** Push rows to a `watch()` subscriber by cache key or table name */
    emitRows(key: string, rows: any[]) {
      if (!watchSubjects[key]) {
        watchSubjects[key] = new Subject<any[]>();
      }
      watchSubjects[key].next(rows);
    },
    /** Push a row to a `watchOne()` subscriber by `table:id` */
    emitOne(tableAndId: string, row: any) {
      if (!watchOneSubjects[tableAndId]) {
        watchOneSubjects[tableAndId] = new Subject<any>();
      }
      watchOneSubjects[tableAndId].next(row);
    },
    _watchSubjects: watchSubjects,
    _watchOneSubjects: watchOneSubjects,
  };

  return mock;
}


/**
 * Creates a mock DataService for feature service specs.
 */
export function createMockDataService() {
  return {
    store: jasmine.createSpy('store').and.returnValue(
      Promise.resolve({ success: true, id: 'new-id' })
    ),
    delete: jasmine.createSpy('delete').and.returnValue(
      Promise.resolve(true)
    ),
    getInfos: jasmine.createSpy('getInfos').and.returnValue(of(new Map())),
  };
}


/**
 * Creates a mock AuthService for feature service specs.
 */
export function createMockAuthService() {
  const user = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    isGM: false,
    viewBanner: true,
    viewName: true,
    viewTitle: true,
  };

  return {
    user,
    user$: of(user),
    isLoggedIn: jasmine.createSpy('isLoggedIn').and.returnValue(of(true)),
    login: jasmine.createSpy('login'),
    logout: jasmine.createSpy('logout'),
    redirectUrl: '/',
  };
}


/**
 * Creates a mock StorageService for feature service specs.
 */
export function createMockStorageService() {
  return {
    getDownloadURL: jasmine.createSpy('getDownloadURL').and.callFake(
      (fileName: string) => of(`https://example.com/${fileName}`)
    ),
    uploadFile: jasmine.createSpy('uploadFile').and.returnValue(Promise.resolve()),
    delete: jasmine.createSpy('delete').and.returnValue(Promise.resolve()),
    listFiles: jasmine.createSpy('listFiles').and.returnValue(Promise.resolve([])),
  };
}


/**
 * Returns an array of providers for all commonly injected services.
 * Use in component TestBed configs alongside `schemas: [NO_ERRORS_SCHEMA]`.
 */
export function createComponentTestProviders() {
  return [
    { provide: AuthService, useValue: createMockAuthService() },
    { provide: ApiService, useValue: createMockApiService() },
    { provide: DataService, useValue: createMockDataService() },
    { provide: StorageService, useValue: createMockStorageService() },
    {
      provide: NavigationService,
      useValue: {
        navVisible$: new BehaviorSubject(true),
        pageLabel$: new BehaviorSubject(''),
        showBackButton$: new BehaviorSubject(false),
        getNavigation: () => [],
        navigateBack: jasmine.createSpy('navigateBack'),
        navigateTo: jasmine.createSpy('navigateTo'),
        setNavigationVisible: jasmine.createSpy('setNavigationVisible'),
        setPageLabel: jasmine.createSpy('setPageLabel'),
        toggleNavigation: jasmine.createSpy('toggleNavigation'),
      },
    },
    {
      provide: PopoverService,
      useValue: {
        isPopoverVisible$: new BehaviorSubject(false),
        popoverTitle$: new BehaviorSubject(''),
        popoverComponent$: new Subject(),
        dismissPopover: jasmine.createSpy('dismissPopover'),
        showPopover: jasmine.createSpy('showPopover'),
      },
    },
    {
      provide: UserService,
      useValue: { getUsers: () => of([]) },
    },
    {
      provide: UtilService,
      useValue: {
        orderByName: (a: any, b: any) => 0,
        orderByCreated: (a: any, b: any) => 0,
        slugify: (s: string) => s,
        dataURLtoBlob: () => new Blob(),
      },
    },
    {
      provide: PeopleService,
      useValue: {
        getPeople: () => of([]),
        getPersonById: () => EMPTY,
      },
    },
    {
      provide: PlaceService,
      useValue: {
        getPlaces: () => of([]),
        getPlaceById: () => EMPTY,
        getPlaceInfos: () => of(new Map()),
      },
    },
    {
      provide: QuestsService,
      useValue: {
        getQuests: () => of([]),
        getQuestById: () => EMPTY,
      },
    },
    {
      provide: ProjectService,
      useValue: { getProjects: () => of([]) },
    },
    {
      provide: CombatService,
      useValue: {
        getCombatants: () => of([]),
        getIdsOfPeopleInFight: () => of([]),
        store: jasmine.createSpy('store').and.returnValue(Promise.resolve()),
        delete: jasmine.createSpy('delete').and.returnValue(Promise.resolve()),
        updateCombatant: jasmine.createSpy('updateCombatant').and.returnValue(Promise.resolve()),
      },
    },
    {
      provide: AchievementService,
      useValue: {
        getAchievements: () => of([]),
        store: jasmine.createSpy('store').and.returnValue(Promise.resolve()),
      },
    },
    {
      provide: InventoryService,
      useValue: {
        getInventory: () => of([]),
        store: jasmine.createSpy('store').and.returnValue(Promise.resolve()),
      },
    },
    {
      provide: NotesService,
      useValue: {
        getNotes: () => of([]),
        store: jasmine.createSpy('store').and.returnValue(Promise.resolve()),
      },
    },
    {
      provide: RulesService,
      useValue: {
        getDynamicRules: () => of([]),
        getRulesConfig: () => Promise.resolve({}),
      },
    },
    {
      provide: DiceRollerService,
      useValue: {
        getRecentRolls: () => of([]),
        roll: jasmine.createSpy('roll'),
      },
    },
    {
      provide: CampaignService,
      useValue: {
        getCampaignInfo: () => of(null),
        store: jasmine.createSpy('store').and.returnValue(Promise.resolve()),
      },
    },
    {
      provide: TimelineService,
      useValue: {
        getEvents: () => of([]),
        getTimeline: () => EMPTY,
        loadMoreEvents: jasmine.createSpy('loadMoreEvents'),
        store: jasmine.createSpy('store').and.returnValue(Promise.resolve()),
      },
    },
    {
      provide: ActivatedRoute,
      useValue: {
        params: of({}),
        paramMap: of({ get: () => null }),
        snapshot: { paramMap: { get: () => null } },
      },
    },
    {
      provide: Router,
      useValue: {
        navigate: jasmine.createSpy('navigate'),
        navigateByUrl: jasmine.createSpy('navigateByUrl'),
      },
    },
  ];
}
