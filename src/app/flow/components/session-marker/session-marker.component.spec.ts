import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SessionMarkerComponent } from './session-marker.component';
import type { SessionMarkerFlowItem } from '../../models';

describe('SessionMarkerComponent', () => {
  let component: SessionMarkerComponent;
  let fixture: ComponentFixture<SessionMarkerComponent>;

  const mockSessionMarker: SessionMarkerFlowItem = {
    id: 'marker1',
    type: 'session-marker',
    order: 0,
    date: new Date('2026-01-15')
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SessionMarkerComponent ]
    })
    .compileComponents();
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
    spyOn(window, 'confirm').and.returnValue(true);
    spyOn(component.remove, 'emit');

    component.removeMarker();

    expect(component.remove.emit).toHaveBeenCalledWith('marker1');
  });
});
