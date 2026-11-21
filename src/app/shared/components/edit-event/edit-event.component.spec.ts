import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { EditEventComponent } from './edit-event.component';
import { TimelineService } from '../../../overview/services/timeline.service';
import { createComponentTestProviders } from '../../../testing/supabase-test-helpers';

describe('EditEventComponent', () => {
  let component: EditEventComponent;
  let fixture: ComponentFixture<EditEventComponent>;
  let timelineService: { store: jasmine.Spy };

  beforeEach(async () => {
    timelineService = { store: jasmine.createSpy('store').and.resolveTo({ success: true }) };
    await TestBed.configureTestingModule({
      declarations: [EditEventComponent],
      providers: [...createComponentTestProviders(), { provide: TimelineService, useValue: timelineService }],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(EditEventComponent);
    component = fixture.componentInstance;
    component.props = { timelineId: 't1' } as any;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not send date_legacy when saving an event with only legacy text', () => {
    component.props = { parent: 't1', event: { id: 'e1', owner: 'u1', content: 'x', type: 0, date: null, dateLegacy: 'alt' } } as any;
    component.ngOnInit();
    component.save();
    const [event, id] = timelineService.store.calls.mostRecent().args;
    expect(id).toBe('e1');
    expect(event.date).toBeNull();
    expect('dateLegacy' in event).toBe(false);
    expect('date_legacy' in event).toBe(false);
  });

  it('should pass a chosen date to the service', () => {
    component.props = { parent: 't1' } as any;
    component.eventForm.patchValue({ date: { day: 5, precision: 'day' }, content: 'x' });
    component.save();
    expect(timelineService.store.calls.mostRecent().args[0].date).toEqual({ day: 5, precision: 'day' });
  });

  it('should not save while the date is invalid', () => {
    component.eventForm.controls['date'].setErrors({ invalidDate: true });
    component.save();
    expect(timelineService.store).not.toHaveBeenCalled();
  });
});
