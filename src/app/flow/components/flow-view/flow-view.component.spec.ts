import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { FlowViewComponent } from './flow-view.component';
import { FlowService } from '../../services/flow.service';
import { PopoverService } from '../../../core/services/popover.service';
import { NavigationService } from '../../../core/services/navigation.service';
import { AuthService } from '../../../core/services/auth.service';

describe('FlowViewComponent', () => {
  let component: FlowViewComponent;
  let fixture: ComponentFixture<FlowViewComponent>;
  let flowServiceSpy: jasmine.SpyObj<FlowService>;
  let popoverServiceSpy: jasmine.SpyObj<PopoverService>;

  beforeEach(async () => {
    const flowSpy = jasmine.createSpyObj('FlowService', [
      'getFlowById',
      'getEnrichedFlowItems',
      'addItem',
      'removeItem',
      'reorderItems'
    ]);
    const popoverSpy = jasmine.createSpyObj('PopoverService', ['showPopover']);
    const navigationSpy = jasmine.createSpyObj('NavigationService', ['setPageLabel']);
    const authSpy = { user: { id: 'u1', name: 'Test', isGM: true } };

    flowSpy.getFlowById.and.returnValue(of({ id: 'flow1', date: new Date(), title: 'Test Flow' }));
    flowSpy.getEnrichedFlowItems.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      declarations: [ FlowViewComponent ],
      providers: [
        { provide: FlowService, useValue: flowSpy },
        { provide: PopoverService, useValue: popoverSpy },
        { provide: NavigationService, useValue: navigationSpy },
        { provide: AuthService, useValue: authSpy },
        { provide: ActivatedRoute, useValue: { paramMap: of({ get: () => 'flow1' }) } },
      ]
    })
    .compileComponents();

    flowServiceSpy = TestBed.inject(FlowService) as jasmine.SpyObj<FlowService>;
    popoverServiceSpy = TestBed.inject(PopoverService) as jasmine.SpyObj<PopoverService>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FlowViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load enriched flow items on init', () => {
    expect(flowServiceSpy.getEnrichedFlowItems).toHaveBeenCalledWith('flow1');
  });

  it('should open AddFlowItemComponent modal when Add Item clicked', () => {
    component.showAddItemModal();
    expect(popoverServiceSpy.showPopover).toHaveBeenCalled();
  });

  it('should remove item via flow service', async () => {
    flowServiceSpy.removeItem.and.returnValue(Promise.resolve(true));
    component.removeItem('item1');
    expect(flowServiceSpy.removeItem).toHaveBeenCalledWith('flow1', 'item1');
  });
});
