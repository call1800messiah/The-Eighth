import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { format, type CalendarDefinition, type FormatStyle, type InGameDate } from '@the-eighth/fantasy-calendar';

import { RulesService } from '../../rules/services/rules.service';

const STORAGE_KEY = 'calendar-display';

/** The tenant's calendars, and which one dates are shown in. */
@Injectable({ providedIn: 'root' })
export class CalendarService {
  private rules = inject(RulesService);
  private defaultId = '';

  calendars: CalendarDefinition[] = [];
  readonly displayCalendar$ = new BehaviorSubject<string>(CalendarService.readStored());

  get defaultCalendar(): CalendarDefinition {
    return this.calendars.find((c) => c.id === this.defaultId) ?? this.calendars[0];
  }

  async load(): Promise<void> {
    try {
      const rules = await this.rules.getRulesConfig();
      const config = rules?.calendars;
      if (!config?.list?.length) {
        console.error('rules.json defines no calendars; dates will not be shown');
        return;
      }
      this.calendars = config.list;
      this.defaultId = config.default;
    } catch (error) {
      console.error('Could not load calendars', error);
      return;
    }
    if (!this.calendars.some((c) => c.id === this.displayCalendar$.value)) {
      this.displayCalendar$.next(this.defaultCalendar.id);
    }
  }

  setDisplayCalendar(id: string): void {
    this.displayCalendar$.next(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // storage unavailable; the choice just isn't remembered
    }
  }

  get(id?: string): CalendarDefinition {
    return this.calendars.find((c) => c.id === (id ?? this.displayCalendar$.value)) ?? this.defaultCalendar;
  }

  format(date: InGameDate | null, calendarId?: string, style?: FormatStyle): string {
    const calendar = this.get(calendarId);
    if (!date || !calendar) {
      return '';
    }
    return format(calendar, date, style);
  }

  private static readStored(): string {
    try {
      return localStorage.getItem(STORAGE_KEY) ?? '';
    } catch {
      return '';
    }
  }
}
