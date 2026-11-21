import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendarService } from '../../../core/calendar/calendar.service';
import { CalendarDatePipe } from '../../pipes/calendar-date.pipe';
import { InGameDateComponent } from './in-game-date.component';

describe('InGameDateComponent', () => {
  let fixture: ComponentFixture<InGameDateComponent>;
  const el = () => fixture.nativeElement as HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [InGameDateComponent, CalendarDatePipe],
      providers: [{
        provide: CalendarService,
        useValue: { format: (d: any) => (d ? 'FORMATTED' : '') },
      }],
    });
    fixture = TestBed.createComponent(InGameDateComponent);
  });

  it('shows the legacy text when there is no date', () => {
    fixture.componentRef.setInput('date', null);
    fixture.componentRef.setInput('legacy', 'Alt 1');
    fixture.detectChanges();
    const span = el().querySelector('span.legacy-date');
    expect(span?.textContent?.trim()).toBe('Alt 1');
    expect(span?.getAttribute('title')).toBe('Altes Datum, noch nicht umgewandelt');
  });

  it('shows the formatted date and ignores legacy', () => {
    fixture.componentRef.setInput('date', { day: 1, precision: 'day' });
    fixture.componentRef.setInput('legacy', 'Alt 1');
    fixture.detectChanges();
    expect(el().textContent?.trim()).toBe('FORMATTED');
    expect(el().querySelector('.legacy-date')).toBeNull();
  });

  it('renders nothing when both are empty', () => {
    fixture.detectChanges();
    expect(el().textContent?.trim()).toBe('');
  });
});
