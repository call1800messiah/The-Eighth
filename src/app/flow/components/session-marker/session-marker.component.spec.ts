import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SessionMarkerComponent } from './session-marker.component';
import { FlowService } from '../../services/flow.service';
import type { SessionMarkerFlowItem } from '../../models';

describe('SessionMarkerComponent', () => {
  let component: SessionMarkerComponent;
  let fixture: ComponentFixture<SessionMarkerComponent>;
  let flowServiceSpy: jasmine.SpyObj<FlowService>;

  const mockSessionMarker: SessionMarkerFlowItem = {
    id: 'marker1',
    type: 'session-marker',
    order: 0,
    date: new Date('2026-01-15')
  };

  beforeEach(async () => {
    const flowSpy = jasmine.createSpyObj('FlowService', ['updateSessionMarker']);

    await TestBed.configureTestingModule({
      declarations: [ SessionMarkerComponent ],
      providers: [
        { provide: FlowService, useValue: flowSpy }
      ]
    })
    .compileComponents();

    flowServiceSpy = TestBed.inject(FlowService) as jasmine.SpyObj<FlowService>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SessionMarkerComponent);
    component = fixture.componentInstance;
    component.item = mockSessionMarker;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('T-FLOW-C35: should display formatted date', () => {
    const formatted = component.getFormattedDate();
    expect(formatted).toContain('2026');
    expect(formatted).toContain('Januar');
  });

  it('T-FLOW-C36: should emit remove event when delete clicked', () => {
    spyOn(component.remove, 'emit');

    component.removeMarker();

    expect(component.remove.emit).toHaveBeenCalledWith('marker1');
  });

  it('should start edit mode', () => {
    component.startEdit();

    expect(component.editing).toBe(true);
    expect(component.editDate).toBe('2026-01-15');
  });

  it('should cancel edit mode', () => {
    component.startEdit();
    component.cancelEdit();

    expect(component.editing).toBe(false);
    expect(component.editDate).toBe('');
  });

  it('should save edited date', async () => {
    flowServiceSpy.updateSessionMarker.and.returnValue(Promise.resolve(true));
    component.startEdit();
    component.editDate = '2026-02-20';

    await component.saveEdit();

    expect(flowServiceSpy.updateSessionMarker).toHaveBeenCalledWith('marker1', jasmine.any(Date));
    expect(component.editing).toBe(false);
  });
});
