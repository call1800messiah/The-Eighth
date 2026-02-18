import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of } from 'rxjs';

import { EditAccessComponent } from './edit-access.component';
import { ApiService } from '../../../core/services/api.service';
import { UserService } from '../../../core/services/user.service';
import { createMockQueryBuilder } from '../../../testing/supabase-test-helpers';
import type { User } from '../../../core/models/user';

describe('EditAccessComponent', () => {
  let component: EditAccessComponent;
  let fixture: ComponentFixture<EditAccessComponent>;
  let mockApi: any;
  let queryBuilder: any;

  const users: User[] = [
    { id: 'user-1', name: 'Alice', isGM: false, viewBanner: true, viewName: true, viewTitle: true },
    { id: 'user-2', name: 'Bob', isGM: false, viewBanner: true, viewName: true, viewTitle: true },
    { id: 'user-3', name: 'GM', isGM: true, viewBanner: true, viewName: true, viewTitle: true },
  ];

  function setupQueryBuilder(data: any[], error: any = null) {
    queryBuilder = createMockQueryBuilder({ data, error });
    mockApi.from.and.returnValue(queryBuilder);
  }

  beforeEach(async () => {
    queryBuilder = createMockQueryBuilder({ data: [], error: null });

    mockApi = {
      from: jasmine.createSpy('from').and.returnValue(queryBuilder),
    };

    await TestBed.configureTestingModule({
      declarations: [EditAccessComponent],
      providers: [
        { provide: ApiService, useValue: mockApi },
        {
          provide: UserService,
          useValue: {
            getUsers: () => of(users),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EditAccessComponent);
    component = fixture.componentInstance;
    component.props = { collection: 'people', documentId: 'doc-1' };
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should query document_access with mapped entity_type on init', fakeAsync(() => {
    setupQueryBuilder([{ user_id: 'user-1' }]);
    fixture.detectChanges();
    tick();

    expect(mockApi.from).toHaveBeenCalledWith('document_access');
    expect(queryBuilder.eq).toHaveBeenCalledWith('entity_type', 'person');
    expect(queryBuilder.eq).toHaveBeenCalledWith('entity_id', 'doc-1');
  }));

  it('should map places collection to place entity_type', fakeAsync(() => {
    component.props = { collection: 'places', documentId: 'doc-2' };
    setupQueryBuilder([]);
    fixture.detectChanges();
    tick();

    expect(queryBuilder.eq).toHaveBeenCalledWith('entity_type', 'place');
  }));

  it('should populate selected checkboxes from existing grants', fakeAsync(() => {
    setupQueryBuilder([{ user_id: 'user-1' }]);
    fixture.detectChanges();
    tick();

    expect(component.selected['user-1']).toBe(true);
    expect(component.selected['user-2']).toBe(false);
    // GM is always checked (implicit access via RLS)
    expect(component.selected['user-3']).toBe(true);
  }));

  it('should delete with mapped entity_type on save', fakeAsync(() => {
    setupQueryBuilder([]);
    fixture.detectChanges();
    tick();

    component.selected = { 'user-1': false, 'user-2': false };
    const deleteBuilder = createMockQueryBuilder({ data: null, error: null });
    mockApi.from.and.returnValue(deleteBuilder);

    spyOn(component.dismissPopover, 'emit');
    component.save();
    tick();

    expect(mockApi.from).toHaveBeenCalledWith('document_access');
    expect(deleteBuilder.delete).toHaveBeenCalled();
    expect(deleteBuilder.eq).toHaveBeenCalledWith('entity_type', 'person');
    expect(deleteBuilder.eq).toHaveBeenCalledWith('entity_id', 'doc-1');
  }));

  it('should insert rows with mapped entity_type on save, excluding GMs', fakeAsync(() => {
    setupQueryBuilder([]);
    fixture.detectChanges();
    tick();

    // GM (user-3) is checked but should be excluded from document_access inserts
    component.selected = { 'user-1': true, 'user-2': false, 'user-3': true };

    const saveBuilder = createMockQueryBuilder({ data: null, error: null });
    mockApi.from.and.returnValue(saveBuilder);

    spyOn(component.dismissPopover, 'emit');
    component.save();
    tick();

    expect(saveBuilder.insert).toHaveBeenCalledWith([
      { entity_type: 'person', entity_id: 'doc-1', user_id: 'user-1' },
    ]);
  }));

  it('should dismiss popover after save', fakeAsync(() => {
    setupQueryBuilder([]);
    fixture.detectChanges();
    tick();

    component.selected = { 'user-1': false };
    const saveBuilder = createMockQueryBuilder({ data: null, error: null });
    mockApi.from.and.returnValue(saveBuilder);

    spyOn(component.dismissPopover, 'emit');
    component.save();
    tick();

    expect(component.dismissPopover.emit).toHaveBeenCalledWith(true);
  }));

  it('should allow access for all users', fakeAsync(() => {
    setupQueryBuilder([]);
    fixture.detectChanges();
    tick();

    component.selected = { 'user-1': false, 'user-2': false, 'user-3': false };
    component.allowAccessForAll();

    expect(component.selected['user-1']).toBe(true);
    expect(component.selected['user-2']).toBe(true);
    expect(component.selected['user-3']).toBe(true);
  }));
});
