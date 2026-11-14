import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { SupabaseClient } from '@supabase/supabase-js';

import { ToolError } from '../src/tools/entities.js';
import { SchemaCatalog, isHiddenIdentifier } from '../src/tools/schema.js';

const column = (name: string) => ({ name, type: 'text', nullable: true, references: null, values: null, note: null });

const SAMPLE = [
  { name: 'mcp_tokens', note: null, columns: [column('id')] },
  { name: 'people', note: 'Personen', columns: [column('id'), column('name')] },
  { name: 'person_tags', note: 'Tags', columns: [column('person_id'), column('tag')] },
];

/** A client whose rpc answers from the given list, one response per call. */
function fakeClient(responses: { data?: unknown; error?: { message: string } | null }[]) {
  const calls: string[] = [];
  const client = {
    rpc: async (fn: string) => {
      calls.push(fn);
      const next = responses.shift() ?? { data: SAMPLE };
      return { data: next.data ?? null, error: next.error ?? null };
    },
  } as unknown as SupabaseClient;
  return { calls, db: async () => client };
}

describe('isHiddenIdentifier', () => {
  it('finds mcp_ identifiers anywhere', () => {
    assert.equal(isHiddenIdentifier('mcp_tokens'), true);
    assert.equal(isHiddenIdentifier('g:mcp_grants(*)'), true);
    assert.equal(isHiddenIdentifier('users(MCP_grants(*))'), true);
  });

  it('leaves other names alone', () => {
    assert.equal(isHiddenIdentifier('people'), false);
    assert.equal(isHiddenIdentifier('campaign'), false);
    assert.equal(isHiddenIdentifier('xmcp_a'), false);
  });
});

describe('SchemaCatalog', () => {
  it('drops mcp_ tables', async () => {
    const { db } = fakeClient([{ data: SAMPLE }]);
    const tables = await new SchemaCatalog(db).tables();
    assert.deepEqual(tables.map(t => t.name), ['people', 'person_tags']);
  });

  it('caches success', async () => {
    const { db, calls } = fakeClient([{ data: SAMPLE }]);
    const catalog = new SchemaCatalog(db);
    await catalog.tables();
    await catalog.tables();
    assert.deepEqual(calls, ['assistant_schema']);
  });

  it('retries after a failure', async () => {
    const { db, calls } = fakeClient([{ error: { message: 'down' } }, { data: SAMPLE }]);
    const catalog = new SchemaCatalog(db);
    await assert.rejects(catalog.tables(), (e: unknown) => e instanceof ToolError && /down/.test(e.message));
    assert.equal((await catalog.tables()).length, 2);
    assert.equal(calls.length, 2);
  });

  it('finds one table by name', async () => {
    const { db } = fakeClient([{ data: SAMPLE }]);
    const catalog = new SchemaCatalog(db);
    assert.equal((await catalog.table('people'))?.note, 'Personen');
    assert.equal(await catalog.table('mcp_tokens'), undefined);
  });
});
