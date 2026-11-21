import { Pipe, PipeTransform } from '@angular/core';
import type { FormatStyle, InGameDate } from '@the-eighth/fantasy-calendar';

import { CalendarService } from '../../core/calendar/calendar.service';

@Pipe({
  name: 'calendarDate',
  pure: false,
  standalone: false,
})
export class CalendarDatePipe implements PipeTransform {
  constructor(private calendar: CalendarService) { }

  transform(date: InGameDate | null, calendarId?: string, style?: FormatStyle): string {
    return this.calendar.format(date, calendarId, style);
  }
}
