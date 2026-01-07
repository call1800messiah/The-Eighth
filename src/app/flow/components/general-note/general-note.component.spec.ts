import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GeneralNoteComponent } from './general-note.component';
import { FlowService } from '../../services/flow.service';
import type { GeneralNoteFlowItem } from '../../models';

describe('GeneralNoteComponent', () => {
  let component: GeneralNoteComponent;
  let fixture: ComponentFixture<GeneralNoteComponent>;
  let flowServiceSpy: jasmine.SpyObj<FlowService>;

  const mockNote: GeneralNoteFlowItem = {
    id: 'note1',
    type: 'general-note',
    order: 0,
    content: 'Test note content'
  };

  beforeEach(async () => {
    const flowSpy = jasmine.createSpyObj('FlowService', ['updateGeneralNote']);

    await TestBed.configureTestingModule({
      declarations: [ GeneralNoteComponent ],
      providers: [
        { provide: FlowService, useValue: flowSpy }
      ]
    })
    .compileComponents();

    flowServiceSpy = TestBed.inject(FlowService) as jasmine.SpyObj<FlowService>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GeneralNoteComponent);
    component = fixture.componentInstance;
    component.item = mockNote;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('T-FLOW-C38: should display note content', () => {
    expect(component.item.content).toBe('Test note content');
  });

  it('T-FLOW-C39: should enable inline editing when edit clicked', () => {
    expect(component.editing).toBe(false);
    component.startEdit();
    expect(component.editing).toBe(true);
    expect(component.editContent).toBe('Test note content');
  });

  it('T-FLOW-C40: should update note content via FlowService', async () => {
    flowServiceSpy.updateGeneralNote.and.returnValue(Promise.resolve(true));
    component.startEdit();
    component.editContent = 'Updated content';

    await component.saveEdit();

    expect(flowServiceSpy.updateGeneralNote).toHaveBeenCalledWith('note1', 'Updated content');
    expect(component.editing).toBe(false);
  });

  it('T-FLOW-C41: should emit remove event when delete clicked', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    spyOn(component.remove, 'emit');

    component.removeNote();

    expect(component.remove.emit).toHaveBeenCalledWith('note1');
  });
});
