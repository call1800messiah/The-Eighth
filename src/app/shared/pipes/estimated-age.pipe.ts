import { OnDestroy, Pipe, PipeTransform, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { yearOf, type CalendarDefinition, type InGameDate } from '@the-eighth/fantasy-calendar';

import { CalendarService } from '../../core/calendar/calendar.service';
import { CampaignService } from '../../overview/services/campaign.service';



@Pipe({
  name: 'estimatedAge',
  pure: false,
  standalone: false
})
export class EstimatedAgePipe implements PipeTransform, OnDestroy {
  private campaignService = inject(CampaignService);
  private calendars = inject(CalendarService);

  private subscription = new Subscription();
  private campaignDate: InGameDate | null = null;
  /** Impure, so it runs on every change detection: remember the last answer. */
  private lastKey = '';
  private lastResult = '';

  constructor() {
    this.subscription.add(
      this.campaignService.getCampaignInfo().subscribe((data) => {
        this.campaignDate = data?.date ?? null;
      })
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  transform(birth: InGameDate | null): string {
    if (!birth) {
      return '';
    }
    // Birth years are Aventurian years whatever calendar the viewer reads.
    const calendar = this.calendars.defaultCalendar;
    const key = `${calendar?.id}|${birth.day}|${birth.precision}|${this.campaignDate?.day}`;
    if (key !== this.lastKey) {
      this.lastKey = key;
      this.lastResult = this.describe(birth, calendar);
    }
    return this.lastResult;
  }

  private describe(birth: InGameDate, calendar: CalendarDefinition | undefined): string {
    if (!this.campaignDate || !calendar) {
      return this.calendars.format(birth, calendar?.id);
    }
    const age = yearOf(calendar, this.campaignDate.day) - yearOf(calendar, birth.day);

    if (age > 10000) {
      return 'unermeßlich alt';
    }
    if (age > 2000) {
      return 'mehrere tausend Jahre';
    }
    if (age > 1000) {
      return 'über tausend Jahre';
    }
    if (age > 300) {
      return 'mehrere hundert Jahre';
    }
    if (age > 60) {
      return `ca. ${Math.round(age / 10) * 10} Jahre`;
    }
    if (age > 20) {
      return `ca. ${Math.round(age / 5) * 5} Jahre`;
    }

    return `ca. ${age} Jahre`;
  }

}
