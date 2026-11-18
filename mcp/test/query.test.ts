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
    { table: 'users', select: 'id, m cp_grants(*)' },
    { table: 'users', select: 'users(mcp\t_grants(*))' },
    { table: 'people', filters: [{ column: 'm cp_grants.id', op: 'eq' as const, value: 'x' }] },
  ]) {
    it(`refuses ${JSON.stringify(input)} before calling the database`, async () => {
      await assert.rejects(reader.query(input), (e: unknown) => e instanceof ToolError && /connection tables/.test(e.message));
    });
  }
});

describe('QueryReader quoted identifiers', () => {
  const untouchable = async (): Promise<SupabaseClient> => { throw new Error('database was called'); };
  const reader = new QueryReader(untouchable, new SchemaCatalog(untouchable));

  for (const input of [
    { table: 'users', select: 'id, "m\\cp_grants"(*)' },
    { table: 'people', select: '"name"' },
    { table: 'people', order: [{ column: '"name"' }] },
  ]) {
    it(`refuses ${JSON.stringify(input)} before calling the database`, async () => {
      await assert.rejects(reader.query(input), (e: unknown) => e instanceof ToolError && /quote|backslash/i.test(e.message));
    });
  }
});

describe('fitRows offset', () => {
  it('points the next page past the request offset', () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({ name: `row number ${i}` }));
    const result = fitRows(rows, 100, 100);
    assert.match(result.truncated!, new RegExp(`offset: ${100 + result.rows.length}\.`));
  });
});

const col = (name: string, type = 'text') =>
  ({ name, type, nullable: true, references: null, values: null, occurring: null, note: null });

/** A client whose PostgREST builder records every call; rpc answers with the given schemas in turn. */
function recordingClient(schemas: unknown[][]) {
  const calls: unknown[][] = [];
  let rpcs = 0;
  const builder: any = {};
  for (const method of ['select', 'filter', 'order', 'range', 'limit']) {
    builder[method] = (...args: unknown[]) => { calls.push([method, ...args]); return builder; };
  }
  builder.then = (resolve: (value: unknown) => void) => resolve({ data: [], error: null, count: 0 });
  const client = {
    rpc: async () => ({ data: schemas[Math.min(rpcs++, schemas.length - 1)], error: null }),
    from: (table: string) => { calls.push(['from', table]); return builder; },
  } as unknown as SupabaseClient;
  return { calls, rpcCount: () => rpcs, db: async () => client };
}

const PEOPLE = { name: 'people', note: null, columns: [col('id', 'uuid'), col('name')] };
const TOKENS = { name: 'combat_tokens', note: null, columns: [col('combatant_id', 'uuid'), col('x', 'real')] };

describe('QueryReader paging order', () => {
  it('orders by id after the requested order', async () => {
    const { db, calls } = recordingClient([[PEOPLE]]);
    await new QueryReader(db, new SchemaCatalog(db)).query({ table: 'people', order: [{ column: 'name' }], offset: 50 });
    const orders = calls.filter(c => c[0] === 'order').map(c => c[1]);
    assert.deepEqual(orders, ['name', 'id']);
  });

  it('does not order by id twice', async () => {
    const { db, calls } = recordingClient([[PEOPLE]]);
    await new QueryReader(db, new SchemaCatalog(db)).query({ table: 'people', order: [{ column: 'id', ascending: false }] });
    assert.deepEqual(calls.filter(c => c[0] === 'order').map(c => c[1]), ['id']);
  });

  it('uses combatant_id for combat_tokens', async () => {
    const { db, calls } = recordingClient([[TOKENS]]);
    await new QueryReader(db, new SchemaCatalog(db)).query({ table: 'combat_tokens' });
    assert.deepEqual(calls.filter(c => c[0] === 'order').map(c => c[1]), ['combatant_id']);
  });

  it('adds no order to a count-only query', async () => {
    const { db, calls } = recordingClient([[PEOPLE]]);
    await new QueryReader(db, new SchemaCatalog(db)).query({ table: 'people', limit: 0 });
    assert.equal(calls.filter(c => c[0] === 'order').length, 0);
  });
});

describe('QueryReader null filters', () => {
  for (const op of ['eq', 'neq', 'like', 'gt'] as const) {
    it(`refuses null with ${op}`, async () => {
      const { db } = recordingClient([[PEOPLE]]);
      await assert.rejects(
        new QueryReader(db, new SchemaCatalog(db)).query({ table: 'people', filters: [{ column: 'name', op, value: null }] }),
        (e: unknown) => e instanceof ToolError && /"is"/.test(e.message));
    });
  }

  it('sends is.null', async () => {
    const { db, calls } = recordingClient([[PEOPLE]]);
    await new QueryReader(db, new SchemaCatalog(db)).query({ table: 'people', filters: [{ column: 'name', op: 'is', value: null }] });
    assert.deepEqual(calls.find(c => c[0] === 'filter'), ['filter', 'name', 'is', 'null']);
  });
});

describe('QueryReader schema freshness', () => {
  it('reloads once before refusing a table it does not know', async () => {
    const { db, rpcCount } = recordingClient([[PEOPLE], [PEOPLE, TOKENS]]);
    const reader = new QueryReader(db, new SchemaCatalog(db));
    await reader.query({ table: 'people' });
    await reader.query({ table: 'combat_tokens' });
    assert.equal(rpcCount(), 2);
    await assert.rejects(reader.query({ table: 'nope' }), (e: unknown) => e instanceof ToolError && /Unknown table/.test(e.message));
    assert.equal(rpcCount(), 3);
  });

  it('describe reads current values every time', async () => {
    const tagged = (n: number) => [{ ...PEOPLE, columns: [...PEOPLE.columns, { ...col('race'), occurring: [{ value: 'Elf', count: n }] }] }];
    const { db } = recordingClient([tagged(1), tagged(2)]);
    const reader = new QueryReader(db, new SchemaCatalog(db));
    await reader.describe('people');
    const [people] = await reader.describe('people') as any[];
    assert.equal(people.columns[2].occurring[0].count, 2);
  });
});
