import { isDead } from './person';

describe('isDead', () => {
  it('is true for a legacy death text only', () => {
    expect(isDead({ death: null, deathLegacy: 'Bald' })).toBeTrue();
  });

  it('is true for a structured death only', () => {
    expect(isDead({ death: { day: 9, precision: 'day' }, deathLegacy: null })).toBeTrue();
  });

  it('is false when neither is set', () => {
    expect(isDead({ death: null, deathLegacy: null })).toBeFalse();
  });
});
