import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { fromDay, toDay } from '@the-eighth/fantasy-calendar';

import { CalendarService } from '../../../core/calendar/calendar.service';
import { aventurian } from '../../../../../libs/fantasy-calendar/testing/aventurian';
import { gregorian } from '../../../../../libs/fantasy-calendar/testing/gregorian';
import { DateInputComponent } from './date-input.component';

describe('DateInputComponent', () => {
  let fixture: ComponentFixture<DateInputComponent>;
  let component: DateInputComponent;
  let displayId: string;
  let emitted: any[];

  const el = () => fixture.nativeElement as HTMLElement;
  const field = (name: string) => el().querySelector(`[data-field="${name}"]`) as HTMLInputElement & HTMLSelectElement;
  const type = (name: string, value: string) => {
    const f = field(name);
    f.value = value;
    f.dispatchEvent(new Event(f.tagName === 'SELECT' ? 'change' : 'input'));
    fixture.detectChanges();
  };
  const check = (checked: boolean) => {
    const f = field('before');
    f.checked = checked;
    f.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  };
  const dayOf = (year: number, month: number, day: number) => toDay(aventurian, { year, month, day });

  function setup(opts: { calendars?: any[]; required?: boolean; legacy?: string | null } = {}) {
    const calendars = opts.calendars ?? [aventurian];
    displayId = calendars[0]?.id;
    TestBed.configureTestingModule({
      declarations: [DateInputComponent],
      imports: [ReactiveFormsModule],
      providers: [{
        provide: CalendarService,
        useValue: {
          calendars,
          defaultCalendar: calendars[0],
          displayCalendar$: { get value() { return displayId; } },
          get: (id?: string) => calendars.find(c => c.id === (id ?? displayId)) ?? calendars[0],
        },
      }],
    });
    fixture = TestBed.createComponent(DateInputComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('inputId', 'date');
    fixture.componentRef.setInput('required', opts.required ?? false);
    fixture.componentRef.setInput('legacy', opts.legacy ?? null);
    component.registerOnChange((v: any) => emitted.push(v));
    fixture.detectChanges();
  }

  beforeEach(() => { emitted = []; });

  it('fills the fields from a written value', () => {
    setup();
    component.writeValue({ day: dayOf(1036, 10, 29), precision: 'day' });
    fixture.detectChanges();
    expect(field('day').value).toBe('29');
    expect(field('month').value).toBe('10');
    expect(field('year').value).toBe('1036');
    expect(field('precision').value).toBe('day');
    expect(el().querySelector('.weekday')?.textContent?.trim()).toBeTruthy();
    expect(emitted.length).toBe(0);
  });

  it('emits the date typed by the user', () => {
    setup();
    component.writeValue(null);
    type('day', '30');
    type('month', '11');
    type('year', '1030');
    expect(emitted[emitted.length - 1]).toEqual({ day: dayOf(1030, 11, 30), precision: 'day' });
  });

  it('switching to month precision emits the first of the month', () => {
    setup();
    component.writeValue({ day: dayOf(1030, 11, 30), precision: 'day' });
    fixture.detectChanges();
    type('precision', 'month');
    expect(emitted[emitted.length - 1]).toEqual({ day: dayOf(1030, 11, 1), precision: 'month' });
  });

  it('is invalid and emits nothing for a day that does not exist', () => {
    setup();
    component.writeValue(null);
    type('day', '6');
    type('month', '12');
    type('year', '1030');
    expect(emitted.length).toBe(0);
    expect(component.validate({} as any)).toEqual({ invalidDate: true });
  });

  it('is invalid and emits nothing for a year beyond the engine bound', () => {
    setup();
    component.writeValue(null);
    type('precision', 'year');
    type('year', '1000000000000');
    expect(emitted.length).toBe(0);
    expect(component.validate({} as any)).toEqual({ invalidDate: true });
  });

  it('is invalid when partly filled', () => {
    setup();
    component.writeValue(null);
    type('day', '6');
    expect(emitted.length).toBe(0);
    expect(component.validate({} as any)).toEqual({ invalidDate: true });
  });

  it('negates the year when the before-epoch box is checked', () => {
    setup();
    component.writeValue(null);
    type('precision', 'year');
    type('year', '3500');
    check(true);
    expect(emitted[emitted.length - 1]).toEqual({ day: toDay(aventurian, { year: -3500 }), precision: 'year' });
  });

  it('shows a before-epoch year unsigned with the checkbox set', () => {
    setup();
    component.writeValue({ day: toDay(aventurian, { year: -3500 }), precision: 'year' });
    fixture.detectChanges();
    expect(field('year').value).toBe('3500');
    expect(field('before').checked).toBeTrue();
    expect(el().textContent).toContain('v. BF');
  });

  it('treats year 0 as not before the epoch', () => {
    setup();
    component.writeValue({ day: toDay(aventurian, { year: 0 }), precision: 'year' });
    fixture.detectChanges();
    expect(field('year').value).toBe('0');
    expect(field('before').checked).toBeFalse();
  });

  it('never calls onChange after writeValue(null) without user input', () => {
    setup();
    component.writeValue(null);
    fixture.detectChanges();
    expect(emitted.length).toBe(0);
  });

  it('emits null when all fields are cleared', () => {
    setup();
    component.writeValue({ day: dayOf(1036, 10, 29), precision: 'day' });
    fixture.detectChanges();
    type('day', '');
    type('month', '');
    type('year', '');
    expect(emitted[emitted.length - 1]).toBeNull();
    expect(component.validate({} as any)).toBeNull();
  });

  it('requires a value when required', () => {
    setup({ required: true });
    component.writeValue(null);
    fixture.detectChanges();
    expect(component.validate({} as any)).toEqual({ required: true });
  });

  it('shows the calendar select only with several calendars', () => {
    setup();
    expect(field('calendar')).toBeNull();
    TestBed.resetTestingModule();
    setup({ calendars: [aventurian, gregorian] });
    expect(field('calendar')).not.toBeNull();
  });

  it('redisplays the same value when the calendar is switched, without emitting', () => {
    setup({ calendars: [aventurian, gregorian] });
    const date = { day: dayOf(1036, 10, 29), precision: 'day' as const };
    component.writeValue(date);
    fixture.detectChanges();
    type('calendar', 'gregorian');
    const g = fromDay(gregorian, date.day);
    expect(field('year').value).toBe(String(g.year));
    expect(field('month').value).toBe(String(g.month));
    expect(field('day').value).toBe(String(g.day));
    expect(emitted.length).toBe(0);
  });

  it('edits in a non-default calendar produce the right day number', () => {
    setup({ calendars: [aventurian, gregorian] });
    component.writeValue(null);
    type('calendar', 'gregorian');
    type('day', '1');
    type('month', '0');
    type('year', '1970');
    expect(emitted[emitted.length - 1]).toEqual({ day: 0, precision: 'day' });
  });

  it('shows the legacy text', () => {
    setup({ legacy: 'Alt 1' });
    expect(el().querySelector('.legacy')?.textContent).toContain('Bisher: Alt 1');
  });

  it('rejects a negative year instead of flipping its era', () => {
    setup();
    component.writeValue(null);
    type('precision', 'year');
    type('year', '-5');
    check(true);
    expect(component.validate()).toEqual({ invalidDate: true });
    expect(emitted.some(v => v && v.day > 0)).toBe(false);
  });

  it('lets the user discard the old text', () => {
    setup({ legacy: '1. Praios' });
    let discarded = 0;
    component.legacyDiscarded.subscribe(() => discarded++);
    field('discard').click();
    fixture.detectChanges();
    expect(discarded).toBe(1);
    expect(el().querySelector('.legacy')).toBeNull();
  });

  it('shows a notice and does not block the form without a calendar', () => {
    setup({ calendars: [], required: true });
    component.writeValue({ day: 5, precision: 'day' });
    fixture.detectChanges();
    expect(el().querySelector('.notice')).not.toBeNull();
    expect(field('year')).toBeNull();
    expect(component.validate()).toBeNull();
  });
});
