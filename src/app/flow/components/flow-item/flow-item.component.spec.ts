import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FlowItemComponent } from './flow-item.component';
import { AuthService } from '../../../core/services/auth.service';
import type { EnrichedQuestFlowItem } from '../../models';

describe('FlowItemComponent', () => {
  let component: FlowItemComponent;
  let fixture: ComponentFixture<FlowItemComponent>;

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
    const authSpy = { user: { id: 'u1', name: 'Test', isGM: true } };

    await TestBed.configureTestingModule({
      declarations: [ FlowItemComponent ],
      providers: [
        { provide: AuthService, useValue: authSpy }
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FlowItemComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display quest item with name', () => {
    component.item = mockQuestItem;
    fixture.detectChanges();
    expect(component.getEntityName()).toBe('Test Quest');
  });

  it('should show placeholder for deleted entity', () => {
    component.item = mockDeletedItem;
    fixture.detectChanges();
    expect(component.getEntityName()).toBe('Unbekanntes Element');
    expect(component.hasEntity()).toBe(false);
  });

  it('should toggle expanded state on click', () => {
    component.item = mockQuestItem;
    expect(component.expanded).toBe(false);
    component.toggleExpand();
    expect(component.expanded).toBe(true);
    component.toggleExpand();
    expect(component.expanded).toBe(false);
  });

  it('should emit remove event when removeItem called', () => {
    component.item = mockQuestItem;
    spyOn(component.remove, 'emit');
    component.removeItem();
    expect(component.remove.emit).toHaveBeenCalledWith('item1');
  });
});
