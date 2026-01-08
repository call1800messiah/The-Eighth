import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AddFlowItemComponent } from './add-flow-item.component';
import { FlowService } from '../../services/flow.service';
import { QuestsService } from '../../../quests/services/quests.service';
import { PeopleService } from '../../../people/services/people.service';
import { PlaceService } from '../../../places/services/place.service';
import { PopoverService } from '../../../core/services/popover.service';

describe('AddFlowItemComponent', () => {
  let component: AddFlowItemComponent;
  let fixture: ComponentFixture<AddFlowItemComponent>;
  let flowServiceSpy: jasmine.SpyObj<FlowService>;
  let popoverServiceSpy: jasmine.SpyObj<PopoverService>;

  beforeEach(async () => {
    const flowSpy = jasmine.createSpyObj('FlowService', ['addItem', 'addItems']);
    const questsSpy = jasmine.createSpyObj('QuestsService', ['getQuests']);
    const peopleSpy = jasmine.createSpyObj('PeopleService', ['getPeople']);
    const placesSpy = jasmine.createSpyObj('PlaceService', ['getPlaces']);
    const popoverSpy = jasmine.createSpyObj('PopoverService', ['dismissPopover']);

    questsSpy.getQuests.and.returnValue(of([]));
    peopleSpy.getPeople.and.returnValue(of([]));
    placesSpy.getPlaces.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      declarations: [ AddFlowItemComponent ],
      providers: [
        { provide: FlowService, useValue: flowSpy },
        { provide: QuestsService, useValue: questsSpy },
        { provide: PeopleService, useValue: peopleSpy },
        { provide: PlaceService, useValue: placesSpy },
        { provide: PopoverService, useValue: popoverSpy }
      ]
    })
    .compileComponents();

    flowServiceSpy = TestBed.inject(FlowService) as jasmine.SpyObj<FlowService>;
    popoverServiceSpy = TestBed.inject(PopoverService) as jasmine.SpyObj<PopoverService>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AddFlowItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('T-FLOW-C22: should show Quest tab by default', () => {
    expect(component.activeTab).toBe('quest');
  });

  it('T-FLOW-C23: should switch to Person tab', () => {
    component.switchTab('person');
    expect(component.activeTab).toBe('person');
  });

  it('T-FLOW-C30: should toggle item selection', () => {
    expect(component.selectedItems).toEqual([]);
    component.toggleSelection('item1');
    expect(component.selectedItems).toContain('item1');
    component.toggleSelection('item1');
    expect(component.selectedItems).not.toContain('item1');
  });

  it('T-FLOW-C31: should add selected items and close modal', async () => {
    flowServiceSpy.addItems.and.returnValue(Promise.resolve(true));
    component.activeTab = 'quest';
    component.selectedItems = ['quest1', 'quest2'];

    await component.addSelected();

    expect(flowServiceSpy.addItems).toHaveBeenCalledTimes(1);
    expect(flowServiceSpy.addItems).toHaveBeenCalledWith([
      { type: 'quest', questId: 'quest1' },
      { type: 'quest', questId: 'quest2' }
    ]);
    expect(popoverServiceSpy.dismissPopover).toHaveBeenCalled();
  });

  it('T-FLOW-C34: should close modal on cancel', () => {
    component.close();
    expect(popoverServiceSpy.dismissPopover).toHaveBeenCalled();
  });
});
