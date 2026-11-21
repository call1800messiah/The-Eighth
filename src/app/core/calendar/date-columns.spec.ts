import { dateColumns, readDate } from './date-columns';

describe('date-columns', () => {
  it('reads a stored date', () => {
    expect(readDate(5, 'month')).toEqual({ day: 5, precision: 'month' });
  });

  it('reads null when incomplete', () => {
    expect(readDate(null, null)).toBeNull();
    expect(readDate(5, null)).toBeNull();
    expect(readDate(undefined, 'day')).toBeNull();
    expect(readDate(5, 'bogus')).toBeNull();
  });

  it('builds columns', () => {
    expect(dateColumns('birth', null)).toEqual({ birth_day: null, birth_precision: null });
    expect(dateColumns('date', { day: 3, precision: 'year' })).toEqual({ date_day: 3, date_precision: 'year' });
  });
});
