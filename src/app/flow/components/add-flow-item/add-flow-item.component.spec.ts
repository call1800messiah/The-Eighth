import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AddFlowItemComponent } from './add-flow-item.component';
import { FlowService } from '../../services/flow.service';
import { QuestsService } from '../../../quests/services/quests.service';
import { PeopleService } from '../../../people/services/people.service';
import { PlaceService } from '../../../places/services/place.service';
import { NotesService } from '../../../notes/services/notes.service';

describe('AddFlowItemComponent', () => {
  let component: AddFlowItemComponent;
  let fixture: ComponentFixture<AddFlowItemComponent>;
  let flowServiceSpy: jasmine.SpyObj<FlowService>;

  beforeEach(async () => {
    const flowSpy = jasmine.createSpyObj('FlowService', ['addItem', 'addItems']);
    const questsSpy = jasmine.createSpyObj('QuestsService', ['getQuests']);
    const peopleSpy = jasmine.createSpyObj('PeopleService', ['getPeople']);
    const placesSpy = jasmine.createSpyObj('PlaceService', ['getPlaces']);
    const notesSpy = jasmine.createSpyObj('NotesService', ['getNotes']);

    questsSpy.getQuests.and.returnValue(of([]));
    peopleSpy.getPeople.and.returnValue(of([]));
    placesSpy.getPlaces.and.returnValue(of([]));
    notesSpy.getNotes.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      declarations: [ AddFlowItemComponent ],
      providers: [
        { provide: FlowService, useValue: flowSpy },
        { provide: QuestsService, useValue: questsSpy },
        { provide: PeopleService, useValue: peopleSpy },
        { provide: PlaceService, useValue: placesSpy },
        { provide: NotesService, useValue: notesSpy },
      ]
    })
    .compileComponents();

    flowServiceSpy = TestBed.inject(FlowService) as jasmine.SpyObj<FlowService>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AddFlowItemComponent);
    component = fixture.componentInstance;
    component.props = { flowId: 'flow1' };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show Quest tab by default', () => {
    expect(component.activeTab).toBe('quest');
  });

  it('should switch to Person tab', () => {
    component.onTabChange('person');
    expect(component.activeTab).toBe('person');
  });

  it('should toggle item selection', () => {
    expect(component.selectedItems).toEqual([]);
    component.toggleSelection('item1');
    expect(component.selectedItems).toContain('item1');
    component.toggleSelection('item1');
    expect(component.selectedItems).not.toContain('item1');
  });

  it('should add selected items and dismiss popover', async () => {
    flowServiceSpy.addItems.and.returnValue(Promise.resolve(true));
    component.activeTab = 'quest';
    component.selectedItems = ['quest1', 'quest2'];

    spyOn(component.dismissPopover, 'emit');
    await component.addSelected();

    expect(flowServiceSpy.addItems).toHaveBeenCalledWith('flow1', [
      { type: 'quest', questId: 'quest1' },
      { type: 'quest', questId: 'quest2' }
    ]);
    expect(component.dismissPopover.emit).toHaveBeenCalledWith(true);
  });
});
