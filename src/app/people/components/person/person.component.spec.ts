import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';

import { PersonComponent } from './person.component';
import { PeopleService } from '../../services/people.service';
import { SceneService } from '../../services/scene.service';
import { PopoverService } from '../../../core/services/popover.service';
import { EditSceneComponent } from '../edit-scene/edit-scene.component';
import { createComponentTestProviders } from '../../../testing/supabase-test-helpers';

describe('PersonComponent', () => {
  let component: PersonComponent;
  let fixture: ComponentFixture<PersonComponent>;
  let sceneService: jasmine.SpyObj<SceneService>;

  const person = {
    id: 'p1', name: 'Alrik Sohn', owner: 'user-2', relatives: {}, tags: [], attributes: [],
  };

  beforeEach(async () => {
    sceneService = jasmine.createSpyObj('SceneService', ['getScenesForPerson']);
    sceneService.getScenesForPerson.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      declarations: [PersonComponent],
      providers: [
        ...createComponentTestProviders(),
        { provide: PeopleService, useValue: { getPersonById: () => of(person), getPeople: () => of([person]) } },
        { provide: SceneService, useValue: sceneService },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(PersonComponent);
    component = fixture.componentInstance;
    component.entityId = 'p1';
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads the scenes of the person', () => {
    expect(sceneService.getScenesForPerson).toHaveBeenCalledWith('p1');
  });

  it('hides the Szenen tab when there are no scenes', () => {
    expect(fixture.nativeElement.querySelector('app-tab-panel#scenes')).toBeNull();
  });

  it('shows the Szenen tab when there are scenes', async () => {
    sceneService.getScenesForPerson.and.returnValue(of([
      { id: 's1', image: 'url', caption: '', owner: 'user-1', people: ['p1'] },
    ]));
    component.ngOnDestroy();
    component.ngOnInit();
    // Zoneless TestBed: state changed outside an event needs the view marked dirty
    fixture.componentRef.changeDetectorRef.markForCheck();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-tab-panel#scenes')).not.toBeNull();
  });

  it('offers "Szene hinzufügen" to users who do not own the person', () => {
    const entry = component.menu.actions.find(action => action.label === 'Szene hinzufügen');
    expect(entry).toBeDefined();
    expect(entry.restricted).toBeFalsy();

    entry.action();

    expect(TestBed.inject(PopoverService).showPopover).toHaveBeenCalledWith(
      'Szene hinzufügen', EditSceneComponent, { personId: 'p1' },
    );
  });
});
