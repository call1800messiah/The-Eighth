import { dateColumns, readDate, storeDate } from './date-columns';

describe('date-columns', () => {
  it('reads a stored date', () => {
    expect(readDate(5, 'month')).toEqual({ day: 5, precision: 'month' });
  });

  it('reads null when incomplete', () => {
    expect(readDate(null, null)).toBeNull();
    expect(readDate(5, null)).toBeNull();
    expect(readDate(undefined, 'day')).toBeNull();
    expect(readDate(5, 'bogus')).toBeNull();
    expect(readDate(1.5, 'day')).toBeNull();
    expect(readDate(NaN, 'day')).toBeNull();
  });

  it('builds columns', () => {
    expect(dateColumns('birth', null)).toEqual({ birth_day: null, birth_precision: null });
    expect(dateColumns('date', { day: 3, precision: 'year' })).toEqual({ date_day: 3, date_precision: 'year' });
  });

  describe('storeDate', () => {
    it('writes a date and clears its legacy columns', () => {
      const fields: any = { birth: { day: 5, precision: 'year' }, birthLegacy: 'alt' };
      storeDate(fields, 'birth');
      expect(fields).toEqual({
        birth_day: 5, birth_precision: 'year', birthday_legacy: null, birthyear_legacy: null,
      });
    });

    it('keeps the legacy text when the date is empty and the text was not discarded', () => {
      const fields: any = { death: null, deathLegacy: 'Bald' };
      storeDate(fields, 'death');
      expect(fields).toEqual({ death_day: null, death_precision: null });
    });

    it('clears the legacy text when it was discarded, even without a date', () => {
      const fields: any = { death: null, deathLegacy: null };
      storeDate(fields, 'death');
      expect(fields).toEqual({ death_day: null, death_precision: null, deathday_legacy: null });
    });

    it('clears a discarded legacy text when the date field is absent', () => {
      const fields: any = { name: 'x', dateLegacy: null };
      storeDate(fields, 'date');
      expect(fields).toEqual({ name: 'x', date_legacy: null });
    });

    it('leaves everything alone without date or discard', () => {
      const fields: any = { name: 'x' };
      storeDate(fields, 'date');
      expect(fields).toEqual({ name: 'x' });
    });
  });
});
