import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { FlowItemComponent } from './flow-item.component';
import type { EnrichedQuestFlowItem } from '../../models';

describe('FlowItemComponent', () => {
  let component: FlowItemComponent;
  let fixture: ComponentFixture<FlowItemComponent>;
  let routerSpy: jasmine.SpyObj<Router>;

  const mockQuestItem: EnrichedQuestFlowItem = {
    id: 'item1',
    type: 'quest',
    questId: 'quest1',
    order: 0,
    entity: {
      id: 'quest1',
      name: 'Test Quest',
      description: 'Test description',
      completed: false,
      type: 'main' as any,
      access: [],
      owner: 'user1',
      collection: 'quests'
    }
  };

  const mockDeletedItem: EnrichedQuestFlowItem = {
    id: 'item2',
    type: 'quest',
    questId: 'deleted',
    order: 1,
    entity: null
  };

  beforeEach(async () => {
    const routerSpyObj = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      declarations: [ FlowItemComponent ],
      providers: [
        { provide: Router, useValue: routerSpyObj }
      ]
    })
    .compileComponents();

    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FlowItemComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('T-FLOW-C11: should display quest item with name', () => {
    component.item = mockQuestItem;
    fixture.detectChanges();
    expect(component.getEntityName()).toBe('Test Quest');
  });

  it('T-FLOW-C14: should show placeholder for deleted entity', () => {
    component.item = mockDeletedItem;
    fixture.detectChanges();
    expect(component.getEntityName()).toBe('Gelöschtes Element');
    expect(component.hasEntity()).toBe(false);
  });

  it('T-FLOW-C15: should toggle expanded state on click', () => {
    component.item = mockQuestItem;
    expect(component.expanded).toBe(false);
    component.toggleExpand();
    expect(component.expanded).toBe(true);
    component.toggleExpand();
    expect(component.expanded).toBe(false);
  });

  it('T-FLOW-C20: should emit remove event when removeItem called', () => {
    component.item = mockQuestItem;
    spyOn(component.remove, 'emit');
    component.removeItem();
    expect(component.remove.emit).toHaveBeenCalledWith('item1');
  });

  it('T-FLOW-C21: should navigate to quest detail page', () => {
    component.item = mockQuestItem;
    component.navigateToEntity();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/quests', 'quest1']);
  });
});
