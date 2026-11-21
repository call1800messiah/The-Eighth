import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Injector,
  Input,
  OnChanges,
  Output,
  forwardRef,
  inject,
} from '@angular/core';
import {
  AbstractControl,
  ControlValueAccessor,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  NgControl,
  ValidationErrors,
  Validator,
} from '@angular/forms';
import {
  fromDay,
  isValidDate,
  toDay,
  type CalendarDefinition,
  type InGameDate,
  type Precision,
} from '@the-eighth/fantasy-calendar';

import { CalendarService } from '../../../core/calendar/calendar.service';

/**
 * Form control for an in-game date (`InGameDate | null`), entered as day,
 * month and year of a calendar plus a precision.
 *
 * Like the rich-text editor, it only emits once the user edits, so opening a
 * form never rewrites a stored value. A partly filled or non-existent date is
 * reported as `{ invalidDate: true }` and is not emitted, and shown as an
 * error once the control is touched (e.g. by `markAllAsTouched()` on save).
 *
 * Without a loaded calendar it cannot read or write a date: it shows a notice,
 * keeps the stored value and does not block the form.
 */
@Component({
  selector: 'app-date-input',
  templateUrl: './date-input.component.html',
  styleUrls: ['./date-input.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => DateInputComponent), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => DateInputComponent), multi: true },
  ],
})
export class DateInputComponent implements ControlValueAccessor, Validator, OnChanges {
  private calendarService = inject(CalendarService);
  private cdr = inject(ChangeDetectorRef);
  private injector = inject(Injector);

  /** Lets a `<label for="…">` focus the first field. */
  @Input() inputId = '';
  @Input() required = false;
  /** Old free-text date that was not converted yet. */
  @Input() legacy: string | null | undefined;
  /** The user discarded the old text; the form should clear it on save. */
  @Output() legacyDiscarded = new EventEmitter<void>();
  discarded = false;

  readonly precisions: { value: Precision; label: string }[] = [
    { value: 'day', label: 'Tag' },
    { value: 'month', label: 'Monat' },
    { value: 'year', label: 'Jahr' },
  ];

  precision: Precision = 'day';
  /** Field contents as typed; month is the month index or ''. */
  day = '';
  month = '';
  year = '';
  before = false;
  calendarId = this.calendarService.displayCalendar$.value;
  weekday = '';
  disabled = false;

  /** The last value written in or emitted, to skip no-op emissions. */
  private value: InGameDate | null = null;
  private onChange: (value: InGameDate | null) => void = () => {};
  private onTouched: () => void = () => {};
  private onValidatorChange: () => void = () => {};


  get calendars(): CalendarDefinition[] {
    return this.calendarService.calendars;
  }

  get calendar(): CalendarDefinition | undefined {
    return this.calendarService.get(this.calendarId);
  }

  /** The message to show under the fields, once the control was touched. */
  get error(): string | null {
    const control = this.injector.get(NgControl, null, { self: true, optional: true });
    if (!control?.touched || !this.calendar) {
      return null;
    }
    const errors = this.validate();
    if (errors?.['required']) {
      return 'Bitte ein Datum angeben.';
    }
    return errors?.['invalidDate'] ? 'Das Datum ist unvollständig oder existiert nicht.' : null;
  }


  ngOnChanges(): void {
    this.onValidatorChange();
  }


  writeValue(value: InGameDate | null): void {
    this.value = value ?? null;
    this.fill(this.value);
    this.cdr.markForCheck();
  }

  registerOnChange(fn: (value: InGameDate | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  registerOnValidatorChange(fn: () => void): void {
    this.onValidatorChange = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this.cdr.markForCheck();
  }

  validate(_control?: AbstractControl): ValidationErrors | null {
    if (!this.calendar) {
      return null;
    }
    const state = this.read();
    if (state.kind === 'empty') {
      return this.required ? { required: true } : null;
    }
    return state.kind === 'valid' ? null : { invalidDate: true };
  }


  touched(): void {
    this.onTouched();
  }

  discardLegacy(): void {
    this.discarded = true;
    this.legacyDiscarded.emit();
    this.onValidatorChange();
  }

  setPrecision(precision: Precision): void {
    this.precision = precision;
    this.edited();
  }

  setDay(value: string): void {
    this.day = value;
    this.edited();
  }

  setMonth(value: string): void {
    this.month = value;
    this.edited();
  }

  setYear(value: string): void {
    this.year = value;
    this.edited();
  }

  setBefore(checked: boolean): void {
    this.before = checked;
    this.edited();
  }

  /** Redisplays the same date in another calendar; the value does not change. */
  setCalendar(id: string): void {
    const state = this.read();
    const date = state.kind === 'valid' ? state.date : this.value;
    this.calendarId = id;
    if (date) {
      this.fill(date);
    }
    this.onValidatorChange();
  }


  private fill(date: InGameDate | null): void {
    if (!date) {
      this.day = this.month = this.year = '';
      this.before = false;
      this.weekday = '';
      return;
    }
    const def = this.calendar;
    if (!def) {
      return;
    }
    const resolved = fromDay(def, date.day);
    this.precision = date.precision;
    this.day = String(resolved.day);
    this.month = String(resolved.month);
    this.year = String(Math.abs(resolved.year));
    this.before = resolved.year < 0;
    this.weekday = date.precision === 'day' ? (def.week.days[resolved.weekday] ?? '') : '';
  }

  private edited(): void {
    if (!this.calendar) {
      return;
    }
    const state = this.read();
    this.weekday = '';
    if (state.kind === 'valid') {
      if (state.date.precision === 'day') {
        this.weekday = this.calendar.week.days[fromDay(this.calendar, state.date.day).weekday] ?? '';
      }
      this.emit(state.date);
    } else if (state.kind === 'empty') {
      this.emit(null);
    }
    this.onValidatorChange();
  }

  private emit(date: InGameDate | null): void {
    const same = date === this.value || (!!date && !!this.value
      && date.day === this.value.day && date.precision === this.value.precision);
    if (!same) {
      this.value = date;
      this.onChange(date);
    }
  }

  private read(): { kind: 'empty' } | { kind: 'invalid' } | { kind: 'valid'; date: InGameDate } {
    const needsDay = this.precision === 'day';
    const needsMonth = this.precision !== 'year';
    const day = this.day.trim();
    const month = this.month.trim();
    const year = this.year.trim();

    if ((!needsDay || day === '') && (!needsMonth || month === '') && year === '') {
      return { kind: 'empty' };
    }
    if ((needsDay && day === '') || (needsMonth && month === '') || year === '') {
      return { kind: 'invalid' };
    }

    const y = Number(year);
    // The era is the checkbox; a typed sign would contradict it.
    if (y < 0) {
      return { kind: 'invalid' };
    }
    const parts = {
      year: this.before && y !== 0 ? -y : y,
      month: needsMonth ? Number(month) : 0,
      day: needsDay ? Number(day) : 1,
    };
    const def = this.calendar;
    if (!def || !isValidDate(def, parts)) {
      return { kind: 'invalid' };
    }
    const dayNumber = toDay(def, parts);
    // Stored as BIGINT but read back only if exact in JavaScript (readDate).
    if (!Number.isSafeInteger(dayNumber)) {
      return { kind: 'invalid' };
    }
    return { kind: 'valid', date: { day: dayNumber, precision: this.precision } };
  }
}
