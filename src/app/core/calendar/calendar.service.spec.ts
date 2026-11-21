import { TestBed } from '@angular/core/testing';

import { aventurian } from '../../../../libs/fantasy-calendar/testing/aventurian';
import { gregorian } from '../../../../libs/fantasy-calendar/testing/gregorian';
import { RulesService } from '../../rules/services/rules.service';
import { CalendarService } from './calendar.service';

describe('CalendarService', () => {
  const KEY = 'calendar-display';

  function setup(rules: any = { calendars: { default: 'aventurian', list: [aventurian, gregorian] } }) {
    TestBed.configureTestingModule({
      providers: [{ provide: RulesService, useValue: { getRulesConfig: () => Promise.resolve(rules) } }],
    });
    return TestBed.inject(CalendarService);
  }

  beforeEach(() => localStorage.removeItem(KEY));
  afterEach(() => localStorage.removeItem(KEY));

  it('formats with the default calendar after load', async () => {
    const service = setup();
    expect(service.calendars).toEqual([]);
    await service.load();
    expect(service.calendars.length).toBe(2);
    expect(service.defaultCalendar.id).toBe('aventurian');
    expect(service.format({ day: 0, precision: 'day' })).toBe('1. Praios 1 BF');
  });

  it('switches the display calendar and persists it', async () => {
    const service = setup();
    await service.load();
    service.setDisplayCalendar('gregorian');
    expect(service.displayCalendar$.value).toBe('gregorian');
    expect(localStorage.getItem(KEY)).toBe('gregorian');
    expect(service.format({ day: 0, precision: 'day' })).not.toBe('1. Praios 1 BF');
    expect(service.format({ day: 0, precision: 'day' }, 'aventurian')).toBe('1. Praios 1 BF');
  });

  it('falls back to the default for an unknown stored id', async () => {
    localStorage.setItem(KEY, 'nonsense');
    const service = setup();
    await service.load();
    expect(service.displayCalendar$.value).toBe('aventurian');
    expect(service.get('nonsense').id).toBe('aventurian');
  });

  it('formats null as an empty string', async () => {
    const service = setup();
    await service.load();
    expect(service.format(null)).toBe('');
  });

  it('returns an empty string for an invalid day without throwing', async () => {
    spyOn(console, 'error');
    const service = setup();
    await service.load();
    expect(service.format({ day: 1.5, precision: 'day' })).toBe('');
    expect(service.format({ day: NaN, precision: 'day' })).toBe('');
    expect(console.error).toHaveBeenCalledTimes(1);
  });

  it('does not throw and formats nothing when rules lack calendars', async () => {
    spyOn(console, 'error');
    const service = setup({});
    await service.load();
    expect(service.format({ day: 0, precision: 'day' })).toBe('');
    expect(console.error).toHaveBeenCalled();
  });
});
