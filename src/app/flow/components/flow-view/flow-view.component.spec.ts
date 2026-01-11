import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { FlowViewComponent } from './flow-view.component';
import { FlowService } from '../../services/flow.service';
import { PopoverService } from '../../../core/services/popover.service';
import { NavigationService } from '../../../core/services/navigation.service';

describe('FlowViewComponent', () => {
  let component: FlowViewComponent;
  let fixture: ComponentFixture<FlowViewComponent>;
  let flowServiceSpy: jasmine.SpyObj<FlowService>;
  let popoverServiceSpy: jasmine.SpyObj<PopoverService>;
  let navigationServiceSpy: jasmine.SpyObj<NavigationService>;

  beforeEach(async () => {
    const flowSpy = jasmine.createSpyObj('FlowService', [
      'getEnrichedFlowItems',
      'addItem',
      'removeItem',
      'reorderItems'
    ]);
    const popoverSpy = jasmine.createSpyObj('PopoverService', ['showPopover']);
    const navigationSpy = jasmine.createSpyObj('NavigationService', ['setPageLabel']);

    flowSpy.getEnrichedFlowItems.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      declarations: [ FlowViewComponent ],
      providers: [
        { provide: FlowService, useValue: flowSpy },
        { provide: PopoverService, useValue: popoverSpy },
        { provide: NavigationService, useValue: navigationSpy }
      ]
    })
    .compileComponents();

    flowServiceSpy = TestBed.inject(FlowService) as jasmine.SpyObj<FlowService>;
    popoverServiceSpy = TestBed.inject(PopoverService) as jasmine.SpyObj<PopoverService>;
    navigationServiceSpy = TestBed.inject(NavigationService) as jasmine.SpyObj<NavigationService>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FlowViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('T-FLOW-C01: should load enriched flow items on init', () => {
    expect(flowServiceSpy.getEnrichedFlowItems).toHaveBeenCalled();
    expect(navigationServiceSpy.setPageLabel).toHaveBeenCalledWith('Session Flow');
  });

  it('T-FLOW-C05: should open AddFlowItemComponent modal when Add Item clicked', () => {
    component.showAddItemModal();
    expect(popoverServiceSpy.showPopover).toHaveBeenCalled();
  });

  it('T-FLOW-C06: should remove item when removeItem called', async () => {
    spyOn(window, 'confirm').and.returnValue(true);
    flowServiceSpy.removeItem.and.returnValue(Promise.resolve(true));
    await component.removeItem('item1');
    expect(flowServiceSpy.removeItem).toHaveBeenCalledWith('item1');
  });
});
