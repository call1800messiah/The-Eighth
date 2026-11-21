import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { EstimatedAgePipe } from './estimated-age.pipe';
import { CampaignService } from '../../overview/services/campaign.service';
import { CalendarService } from '../../core/calendar/calendar.service';
import aventurian from '../../../assets/tde5/rules.json';
import { toDay, type CalendarDefinition, type InGameDate } from '@the-eighth/fantasy-calendar';

const calendar = (aventurian as any).calendars.list[0] as CalendarDefinition;
const birthIn = (year: number): InGameDate => ({ day: toDay(calendar, { year }), precision: 'year' });

describe('EstimatedAgePipe', () => {
  let pipe: EstimatedAgePipe;
  const calendarService: any = {
    defaultCalendar: calendar,
    format: (d: InGameDate | null) => (d ? `fmt:${d.day}` : ''),
  };

  function createPipe(campaignDate: InGameDate | null | undefined) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: CampaignService, useValue: {
          getCampaignInfo: () => of(campaignDate === undefined ? null : { date: campaignDate }),
        } },
        { provide: CalendarService, useValue: calendarService },
      ],
    });
    return TestBed.runInInjectionContext(() => new EstimatedAgePipe());
  }

  beforeEach(() => {
    pipe = createPipe({ day: 378103, precision: 'day' });
  });

  afterEach(() => pipe.ngOnDestroy());

  it('should return the approximate age in years', () => {
    expect(pipe.transform(birthIn(1011))).toBe('ca. 25 Jahre');
  });

  it('should return "unermeßlich alt" for ages over 10000', () => {
    expect(pipe.transform(birthIn(-5000000))).toBe('unermeßlich alt');
  });

  it('should return "mehrere tausend Jahre" for ages 2001-10000', () => {
    expect(pipe.transform(birthIn(-2000))).toBe('mehrere tausend Jahre');
  });

  it('should return "über tausend Jahre" for ages 1001-2000', () => {
    expect(pipe.transform(birthIn(-500))).toBe('über tausend Jahre');
  });

  it('should return "mehrere hundert Jahre" for ages 301-1000', () => {
    expect(pipe.transform(birthIn(636))).toBe('mehrere hundert Jahre');
  });

  it('should round to nearest 10 for ages 61-300', () => {
    expect(pipe.transform(birthIn(956))).toBe('ca. 80 Jahre');
  });

  it('should round to nearest 5 for ages 21-60', () => {
    expect(pipe.transform(birthIn(1001))).toBe('ca. 35 Jahre');
  });

  it('should return an empty string without a birth', () => {
    expect(pipe.transform(null)).toBe('');
  });

  it('should show the formatted birth date when there is no campaign date', () => {
    const p = createPipe(null);
    const birth = birthIn(1010);
    expect(p.transform(birth)).toBe(`fmt:${birth.day}`);
    p.ngOnDestroy();
  });

  it('should answer a repeated call without recomputing, but follow a new birth', () => {
    const format = spyOn(calendarService, 'format').and.callThrough();
    const plain = createPipe(null);
    plain.transform(birthIn(1011));
    plain.transform(birthIn(1011));
    expect(format).toHaveBeenCalledTimes(1);
    plain.transform(birthIn(1012));
    expect(format).toHaveBeenCalledTimes(2);
    plain.ngOnDestroy();
  });
});
