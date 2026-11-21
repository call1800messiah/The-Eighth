import { CalendarDefinition } from '../types.js';

/** Gregorian calendar with day 0 = 1970-01-01. For specs only. */
export const gregorian: CalendarDefinition = {
  id: 'gregorian',
  name: 'Gregorian',
  epochDay: -719162,
  months: [
    { name: 'January', days: 31 },
    { name: 'February', days: 28, leapDays: 1 },
    { name: 'March', days: 31 },
    { name: 'April', days: 30 },
    { name: 'May', days: 31 },
    { name: 'June', days: 30 },
    { name: 'July', days: 31 },
    { name: 'August', days: 31 },
    { name: 'September', days: 30 },
    { name: 'October', days: 31 },
    { name: 'November', days: 30 },
    { name: 'December', days: 31 },
  ],
  week: {
    days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    epochWeekday: 1,
  },
  leap: {
    rules: [
      { every: 4, leap: true },
      { every: 100, leap: false },
      { every: 400, leap: true },
    ],
  },
  era: { suffix: 'AD', beforeSuffix: 'BC', hasYearZero: false },
};
