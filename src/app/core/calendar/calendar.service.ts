import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  format,
  validateCalendar,
  type CalendarDefinition,
  type FormatStyle,
  type InGameDate,
} from '@the-eighth/fantasy-calendar';

import { RulesService } from '../../rules/services/rules.service';

const STORAGE_KEY = 'calendar-display';
/** Formatted dates kept; a full list of people or events stays well below this. */
const FORMAT_CACHE_SIZE = 2000;

/** The tenant's calendars, and which one dates are shown in. */
@Injectable({ providedIn: 'root' })
export class CalendarService {
  private rules = inject(RulesService);
  private defaultId = '';
  private reportedBadDate = false;
  /** Formatting walks up to a leap cycle of years; pipes ask again on every change detection. */
  private formatCache = new Map<string, string>();

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
      // The engine loops forever on a malformed calendar, so leave those out.
      const valid = config.list.filter((calendar) => {
        const errors = validateCalendar(calendar);
        if (errors.length) {
          console.error(`Calendar "${calendar?.id}" in rules.json is invalid and is left out:`, errors);
        }
        return errors.length === 0;
      });
      if (!valid.length) {
        console.error('rules.json defines no valid calendar; dates will not be shown');
        return;
      }
      this.calendars = valid;
      this.defaultId = config.default;
      this.formatCache.clear();
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
    const key = `${calendar.id}|${date.day}|${date.precision}|${style ?? ''}`;
    const cached = this.formatCache.get(key);
    if (cached !== undefined) {
      return cached;
    }
    try {
      const text = format(calendar, date, style);
      if (this.formatCache.size >= FORMAT_CACHE_SIZE) {
        this.formatCache.clear();
      }
      this.formatCache.set(key, text);
      return text;
    } catch (error) {
      if (!this.reportedBadDate) {
        this.reportedBadDate = true;
        console.error('Could not format date', date, error);
      }
      return '';
    }
  }

  private static readStored(): string {
    try {
      return localStorage.getItem(STORAGE_KEY) ?? '';
    } catch {
      return '';
    }
  }
}
