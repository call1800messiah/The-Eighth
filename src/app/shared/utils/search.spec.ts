import { filterBySearch } from './search';

describe('filterBySearch', () => {
  const items = [
    { name: 'Alrik', note: 'Händler' },
    { name: 'Gareth', note: null },
  ];

  it('keeps everything for an empty search', () => {
    expect(filterBySearch(items, '  ', ['name'])).toEqual(items);
  });

  it('matches case-insensitively in any listed field', () => {
    expect(filterBySearch(items, 'HÄND', ['name', 'note'])).toEqual([items[0]]);
    expect(filterBySearch(items, 'reth', ['name'])).toEqual([items[1]]);
    expect(filterBySearch(items, 'händ', ['name'])).toEqual([]);
  });
});
