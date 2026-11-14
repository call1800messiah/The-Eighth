import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { SupabaseClient } from '@supabase/supabase-js';

import { ToolError } from '../src/tools/entities.js';
import { QueryReader, fitRows, inList } from '../src/tools/query.js';
import { SchemaCatalog } from '../src/tools/schema.js';

describe('inList', () => {
  it('quotes values with commas, quotes and parentheses', () => {
    assert.equal(inList(['Gareth, Stadt', 'a"b', 'x(y)', 3]), '("Gareth, Stadt","a\\"b","x(y)",3)');
  });

  it('escapes backslashes', () => {
    assert.equal(inList(['a\\b']), '("a\\\\b")');
  });
});

describe('fitRows', () => {
  it('keeps everything under the cap', () => {
    const result = fitRows([{ a: 1 }, { a: 2 }, { a: 3 }], 1000);
    assert.equal(result.rows.length, 3);
    assert.equal(result.truncated, undefined);
  });

  it('cuts at the cap', () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({ name: `row number ${i}` }));
    const result = fitRows(rows, 100);
    assert.ok(result.rows.length > 0 && result.rows.length < 10);
    assert.ok(JSON.stringify(result.rows).length <= 100);
    assert.match(result.truncated!, /10/);
  });

  it('returns no rows when one row is too big', () => {
    const result = fitRows([{ text: 'x'.repeat(500) }], 100);
    assert.deepEqual(result.rows, []);
    assert.ok(result.truncated);
  });
});

describe('QueryReader refusals', () => {
  const untouchable = async (): Promise<SupabaseClient> => { throw new Error('database was called'); };
  const reader = new QueryReader(untouchable, new SchemaCatalog(untouchable));

  for (const input of [
    { table: 'mcp_tokens' },
    { table: 'users', select: 'g:mcp_grants(*)' },
    { table: 'people', filters: [{ column: 'mcp_grants.id', op: 'eq' as const, value: 'x' }] },
    { table: 'people', order: [{ column: 'mcp_clients.name' }] },
  ]) {
    it(`refuses ${JSON.stringify(input)} before calling the database`, async () => {
      await assert.rejects(reader.query(input), (e: unknown) => e instanceof ToolError && /connection tables/.test(e.message));
    });
  }
});
