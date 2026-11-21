import { CalendarDefinition } from '../types.js';

/** The Aventurian calendar (Bosparan reckoning). For specs only. */
export const aventurian: CalendarDefinition = {
  id: 'aventurian',
  name: 'Aventurian',
  epochDay: 0,
  months: [
    { name: 'Praios', shortName: 'Pra', days: 30 },
    { name: 'Rondra', shortName: 'Ron', days: 30 },
    { name: 'Efferd', shortName: 'Eff', days: 30 },
    { name: 'Travia', shortName: 'Tra', days: 30 },
    { name: 'Boron', shortName: 'Bor', days: 30 },
    { name: 'Hesinde', shortName: 'Hes', days: 30 },
    { name: 'Firun', shortName: 'Fir', days: 30 },
    { name: 'Tsa', days: 30 },
    { name: 'Phex', days: 30 },
    { name: 'Peraine', shortName: 'Per', days: 30 },
    { name: 'Ingerimm', shortName: 'Ing', days: 30 },
    { name: 'Rahja', shortName: 'Rah', days: 30 },
    { name: 'Namenlose Tage', shortName: 'Nam', aliases: ['Namenloser'], days: 5 },
  ],
  week: {
    days: ['Windstag', 'Erdtag', 'Markttag', 'Praiostag', 'Rohalstag', 'Feuertag', 'Wassertag'],
    epochWeekday: 4,
  },
  era: { suffix: 'BF', beforeSuffix: 'v. BF', hasYearZero: true },
};
