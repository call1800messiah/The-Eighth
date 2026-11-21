import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { compareNames } from '../src/tools/entities.js';

describe('compareNames', () => {
  it('sorts German names and puts null last without throwing', () => {
    const names = ['Zauber', null, 'Äxte', 'Bogen', null];
    assert.deepEqual([...names].sort(compareNames), ['Äxte', 'Bogen', 'Zauber', null, null]);
  });
});
