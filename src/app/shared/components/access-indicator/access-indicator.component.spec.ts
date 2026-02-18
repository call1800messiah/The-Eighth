import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { SimpleChange } from '@angular/core';
import { BehaviorSubject, of } from 'rxjs';

import { AccessIndicatorComponent } from './access-indicator.component';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { PopoverService } from '../../../core/services/popover.service';
import { createMockQueryBuilder } from '../../../testing/supabase-test-helpers';
import type { User } from '../../../core/models/user';
import type { AccessControlledItem } from '../../../core/models/access-controlled-item';

describe('AccessIndicatorComponent', () => {
  let component: AccessIndicatorComponent;
  let fixture: ComponentFixture<AccessIndicatorComponent>;
  let mockApi: any;
  let mockPopoverVisible$: BehaviorSubject<boolean>;
  let queryBuilder: any;

  const gmUser: User = { id: 'gm-1', name: 'GM', isGM: true, viewBanner: true, viewName: true, viewTitle: true };
  const ownerUser: User = { id: 'owner-1', name: 'Owner', isGM: false, viewBanner: true, viewName: true, viewTitle: true };
  const playerA: User = { id: 'player-a', name: 'Alice', isGM: false, viewBanner: true, viewName: true, viewTitle: true };
  const playerB: User = { id: 'player-b', name: 'Bob', isGM: false, viewBanner: true, viewName: true, viewTitle: true };
  const allUsers = [gmUser, ownerUser, playerA, playerB];

  const item: AccessControlledItem = {
    id: 'doc-1',
    collection: 'people',
    owner: 'owner-1',
    access: [],
  };

  function setupQueryBuilder(data: any[], error: any = null) {
    queryBuilder = createMockQueryBuilder({ data, error });
    mockApi.from.and.returnValue(queryBuilder);
  }

  beforeEach(async () => {
    mockPopoverVisible$ = new BehaviorSubject<boolean>(false);
    queryBuilder = createMockQueryBuilder({ data: [], error: null });

    mockApi = {
      from: jasmine.createSpy('from').and.returnValue(queryBuilder),
    };

    await TestBed.configureTestingModule({
      declarations: [AccessIndicatorComponent],
      providers: [
        { provide: ApiService, useValue: mockApi },
        {
          provide: AuthService,
          useValue: {
            user: { id: 'owner-1', name: 'Owner', isGM: true, email: 'owner@test.com' },
          },
        },
        {
          provide: UserService,
          useValue: {
            getUsers: () => of(allUsers),
          },
        },
        {
          provide: PopoverService,
          useValue: {
            isPopoverVisible$: mockPopoverVisible$,
            showPopover: jasmine.createSpy('showPopover'),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AccessIndicatorComponent);
    component = fixture.componentInstance;
    component.item = { ...item };
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show "none" state when no grants exist', fakeAsync(() => {
    setupQueryBuilder([]);
    fixture.detectChanges();
    tick();

    expect(component.accessState).toBe('none');
    // GM and owner always appear in usersWithAccess (implicit access via RLS)
    expect(component.usersWithAccess).toEqual(['GM', 'Owner']);
    expect(mockApi.from).toHaveBeenCalledWith('document_access');
    expect(queryBuilder.eq).toHaveBeenCalledWith('entity_type', 'person');
    expect(queryBuilder.eq).toHaveBeenCalledWith('entity_id', 'doc-1');
  }));

  it('should show "some" state when some non-GM/non-owner users have grants', fakeAsync(() => {
    setupQueryBuilder([{ user_id: 'player-a' }]);
    fixture.detectChanges();
    tick();

    expect(component.accessState).toBe('some');
    expect(component.usersWithAccess).toEqual(['Alice', 'GM', 'Owner']);
  }));

  it('should show "all" state when all non-GM/non-owner users have grants', fakeAsync(() => {
    setupQueryBuilder([{ user_id: 'player-a' }, { user_id: 'player-b' }]);
    fixture.detectChanges();
    tick();

    expect(component.accessState).toBe('all');
    expect(component.usersWithAccess).toContain('Alice');
    expect(component.usersWithAccess).toContain('Bob');
    expect(component.usersWithAccess).toContain('GM');
    expect(component.usersWithAccess).toContain('Owner');
  }));

  it('should show "none" when only GM/owner have implicit access', fakeAsync(() => {
    // GMs and owners are not stored in document_access - they have implicit access via RLS
    setupQueryBuilder([]);
    fixture.detectChanges();
    tick();

    expect(component.accessState).toBe('none');
    expect(component.usersWithAccess).toEqual(['GM', 'Owner']);
  }));

  it('should re-fetch when item changes', fakeAsync(() => {
    setupQueryBuilder([]);
    fixture.detectChanges();
    tick();

    expect(mockApi.from).toHaveBeenCalledTimes(1);

    const newItem: AccessControlledItem = { id: 'doc-2', collection: 'quests', owner: 'owner-1', access: [] };
    setupQueryBuilder([{ user_id: 'player-a' }]);
    component.item = newItem;
    component.ngOnChanges({
      item: new SimpleChange(item, newItem, false),
    });
    tick();

    expect(mockApi.from).toHaveBeenCalledTimes(2);
    expect(queryBuilder.eq).toHaveBeenCalledWith('entity_type', 'quest');
    expect(queryBuilder.eq).toHaveBeenCalledWith('entity_id', 'doc-2');
    expect(component.accessState).toBe('some');
  }));

  it('should re-fetch when popover closes', fakeAsync(() => {
    setupQueryBuilder([]);
    fixture.detectChanges();
    tick();

    expect(mockApi.from).toHaveBeenCalledTimes(1);

    setupQueryBuilder([{ user_id: 'player-a' }, { user_id: 'player-b' }]);
    mockPopoverVisible$.next(true);
    mockPopoverVisible$.next(false);
    tick();

    expect(mockApi.from).toHaveBeenCalledTimes(2);
    expect(component.accessState).toBe('all');
  }));

  it('should handle error by setting state to none', fakeAsync(() => {
    setupQueryBuilder([], { message: 'db error' });
    fixture.detectChanges();
    tick();

    expect(component.accessState).toBe('none');
    expect(component.usersWithAccess).toEqual([]);
  }));

  it('should map collection names using getEntityType', fakeAsync(() => {
    component.item = { id: 'doc-1', collection: 'places', owner: 'owner-1', access: [] };
    setupQueryBuilder([]);
    fixture.detectChanges();
    tick();

    expect(queryBuilder.eq).toHaveBeenCalledWith('entity_type', 'place');
  }));
});
