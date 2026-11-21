import { CalendarService } from '../../core/calendar/calendar.service';
import { CalendarDatePipe } from './calendar-date.pipe';

describe('CalendarDatePipe', () => {
  it('delegates to the calendar service', () => {
    const calendar = jasmine.createSpyObj<CalendarService>('CalendarService', ['format']);
    calendar.format.and.returnValue('x');
    const pipe = new CalendarDatePipe(calendar);
    const date = { day: 1, precision: 'day' as const };
    expect(pipe.transform(date, 'gregorian', 'short')).toBe('x');
    expect(calendar.format).toHaveBeenCalledWith(date, 'gregorian', 'short');
  });
});
