import { getEntityType } from './entity-type';

describe('getEntityType', () => {
  it('maps scenes to scene', () => {
    expect(getEntityType('scenes')).toBe('scene');
  });

  it('maps people to person', () => {
    expect(getEntityType('people')).toBe('person');
  });
});
