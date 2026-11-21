import { fromDay, format, toDay, validateCalendar } from '@the-eighth/fantasy-calendar';
import tde5 from '../../../assets/tde5/rules.json';
import theEighth from '../../../assets/the-eighth/rules.json';
import type { CalendarsConfig } from './calendars-config';

describe('calendars config', () => {
  const config = (tde5 as { calendars: CalendarsConfig }).calendars;
  const av = config.list.find((c) => c.id === config.default);

  it('both tenants define the same calendars', () => {
    expect(theEighth.calendars).toEqual(tde5.calendars);
  });

  it('default calendar exists and validates', () => {
    expect(av).toBeDefined();
    expect(validateCalendar(av)).toEqual([]);
  });

  // Changing these numbers re-reads every stored date.
  it('pins known Aventurian dates', () => {
    expect(toDay(av, { year: 1036, month: 10, day: 29 })).toBe(378_103);
    expect(format(av, { day: 0, precision: 'day' })).toBe('1. Praios 1 BF');
    const markttag = av.week.days.indexOf('Markttag');
    expect(fromDay(av, toDay(av, { year: 1000, month: 0, day: 1 })).weekday).toBe(markttag);
  });
});
