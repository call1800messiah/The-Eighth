/**
 * The tools against a real database and PostgREST, acting as the fixture
 * users from supabase/tests/fixtures.sql. Run through test/integration.sh;
 * skipped when TEST_POSTGREST_URL is not set.
 */
import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { PostgrestClient } from '@supabase/postgrest-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import { EntityRepository, ToolError } from '../src/tools/entities.js';
import { createMcpServer } from '../src/tools/register.js';

const URL_ = process.env['TEST_POSTGREST_URL'];
const SECRET = process.env['TEST_JWT_SECRET'];
const APP = new URL('https://campaign.example.com');

const GM = '00000000-0000-4000-8000-00000000000a';
const PLAYER = '00000000-0000-4000-8000-00000000000b';
const CLAUDE = '00000000-0000-4000-8000-00000000000d';

function jwt(sub: string): string {
  const b64 = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const body = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}`;
  return `${body}.${createHmac('sha256', SECRET!).update(body).digest('base64url')}`;
}

/** The slice of SupabaseClient the repository uses, backed by PostgREST directly. */
function as(userId: string): SupabaseClient {
  const rest = new PostgrestClient(URL_!, { headers: { Authorization: `Bearer ${jwt(userId)}` } });
  return {
    from: (table: string) => rest.from(table),
    rpc: (fn: string, args?: object) => rest.rpc(fn, args),
    auth: { getUser: async () => ({ data: { user: { id: userId } }, error: null }) },
  } as unknown as SupabaseClient;
}

function parse(result: any): any {
  const text = result.content[0].text as string;
  try { return JSON.parse(text); } catch { return text; }
}

describe('tools against the database', { skip: !URL_ && 'TEST_POSTGREST_URL not set (run test/integration.sh)' }, () => {
  const gm = () => as(GM);
  const player = () => as(PLAYER);
  const claude = as(CLAUDE);
  const repo = new EntityRepository(async () => claude, APP);
  let mcp: Client;
  let alrik: string;
  let gareth: string;
  let mainQuest: string;

  const call = async (name: string, args: Record<string, unknown>) => mcp.callTool({ name, arguments: args });

  before(async () => {
    // Published entities the GM made, none shared with anyone.
    const insert = async (table: string, row: object) => {
      const { data, error } = await gm().from(table).insert(row).select('id').single();
      assert.equal(error, null, error?.message);
      return (data as { id: string }).id;
    };
    alrik = await insert('people', { name: 'Alrik von Gareth', profession: 'Händler', owner_id: GM });
    gareth = await insert('places', { name: 'Gareth', type: 'city', owner_id: GM });
    mainQuest = await insert('quests', { name: 'Der Schatz im Silbersee', type: 'main', owner_id: GM });
    await insert('notes', { title: 'Geheimplot', content: 'Alrik ist eigentlich ein Spion.', owner_id: GM });

    const server = createMcpServer(repo);
    const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
    mcp = new Client({ name: 'test', version: '1' });
    await Promise.all([server.connect(serverSide), mcp.connect(clientSide)]);
  });

  it('searches what a GM can see, with mention links', async () => {
    const hits = await repo.search('alrik');
    assert.deepEqual(hits.map(hit => [hit.type, hit.name]), [['person', 'Alrik von Gareth'], ['note', 'Geheimplot']]);
    assert.equal(hits[0].mention, `[Alrik von Gareth](mention:person/${alrik})`);
    assert.equal(hits[0].detail, 'Händler');
  });

  it('falls back to single words', async () => {
    const hits = await repo.search('Alrik der Große', ['person']);
    assert.equal(hits[0]?.id, alrik);
  });

  it('treats LIKE wildcards literally', async () => {
    assert.deepEqual(await repo.search('%', ['person']), []);
  });

  it('refuses a duplicate name unless asked', async () => {
    const refused = await call('create_person', { name: 'alrik von gareth' });
    assert.equal(refused.isError, true);
    assert.match(parse(refused), /already exists/);
  });

  let draft: string;

  it('creates a draft person with text sections and mentions', async () => {
    const result = parse(await call('create_person', {
      name: 'Hesindiane',
      profession: 'Magierin',
      birthyear: 1012,
      infos: {
        background: `Schwester von [Alrik](mention:person/${alrik}), lebt in [Gareth](mention:place/${gareth}).`,
        appearance: 'Groß, rotes Haar.',
      },
    }));
    draft = result.created.id;
    assert.equal(result.created.status, 'draft');
    assert.equal(result.url, `https://campaign.example.com/people/${draft}`);
    assert.equal(result.warning, undefined);

    const read = await repo.get('person', draft);
    assert.equal(read['profession'], 'Magierin');
    assert.equal(read['status'], 'draft');
    assert.deepEqual(Object.keys(read['infos'] as object).sort(), ['appearance', 'background']);

    const { data: mentions } = await gm().from('mentions').select('entity_type, entity_id').eq('source_type', 'info_box');
    assert.deepEqual((mentions as any[]).map(m => m.entity_type).sort(), ['person', 'place'], 'backlinks were recorded');
  });

  it('keeps drafts from players', async () => {
    const { data } = await player().from('people').select('id').eq('id', draft);
    assert.deepEqual(data, []);
  });

  it('warns about mention links to nothing', async () => {
    const result = parse(await call('create_quest', {
      name: 'Die verschwundene Karawane', type: 'sub',
      description: 'Siehe [Unbekannt](mention:person/99999999-9999-4999-8999-999999999999).',
    }));
    assert.match(result.warning, /person\/99999999/);
  });

  it('links drafts to published entities, and refuses loops and wrong kinds', async () => {
    assert.match(await repo.link({ type: 'person', id: draft }, 'located_in', { type: 'place', id: gareth }), /Linked/);
    assert.match(await repo.link({ type: 'person', id: draft }, 'has_sibling', { type: 'person', id: alrik }), /Linked/);
    const read = await repo.get('person', draft);
    assert.deepEqual(read['location'], { id: gareth, name: 'Gareth' });
    assert.deepEqual(read['relationships'], [{ type: 'siblings', id: alrik, name: 'Alrik von Gareth' }]);

    await assert.rejects(repo.link({ type: 'person', id: draft }, 'part_of', { type: 'place', id: gareth }), ToolError);

    const a = parse(await call('create_quest', { name: 'Kapitel 1', type: 'sub' })).created.id;
    const b = parse(await call('create_quest', { name: 'Szene 1', type: 'scene' })).created.id;
    await repo.link({ type: 'quest', id: b }, 'part_of', { type: 'quest', id: a });
    await assert.rejects(repo.link({ type: 'quest', id: a }, 'part_of', { type: 'quest', id: b }), /loop/);
    assert.match(await repo.link({ type: 'quest', id: a }, 'part_of', { type: 'quest', id: mainQuest }), /Linked/);
  });

  it('only changes its own drafts', async () => {
    await repo.updateDraft('person', draft, { title: 'Adepta' }, { appearance: '' , character: 'Neugierig.' });
    const read = await repo.get('person', draft);
    assert.equal(read['title'], 'Adepta');
    assert.deepEqual(Object.keys(read['infos'] as object).sort(), ['background', 'character']);

    const refused = await call('update_draft', { type: 'person', id: alrik, fields: { title: 'Spion' } });
    assert.equal(refused.isError, true);
    assert.match(parse(refused), /not one of Claude's drafts/);

    await assert.rejects(repo.link({ type: 'person', id: alrik }, 'located_in', { type: 'place', id: gareth }), ToolError);
  });

  it('cannot write around the tools either', async () => {
    const { error: note } = await claude.from('notes').insert({ content: 'x', owner_id: CLAUDE });
    assert.equal(note?.code, '42501');
    const { error: published } = await claude.from('people').insert({ name: 'Direkt', owner_id: CLAUDE });
    assert.equal(published?.code, '42501');
    const { data: changed } = await claude.from('people').update({ title: 'x' }).eq('id', alrik).select('id');
    assert.deepEqual(changed, []);
  });

  it('rejects fields that do not belong to the type', async () => {
    const result = await call('update_draft', { type: 'person', id: draft, fields: { inhabitants: '12' } });
    assert.equal(result.isError, true);
    assert.match(parse(result), /no inhabitants/);
  });

  it('hands over to the GM on publish', async () => {
    const { error } = await gm().rpc('publish_draft', { p_entity_type: 'person', p_entity_id: draft });
    assert.equal(error, null, error?.message);

    const { data } = await gm().from('person_relationships').select('relationship_type').eq('person_id', alrik).eq('related_person_id', draft);
    assert.deepEqual(data, [{ relationship_type: 'siblings' }], 'reverse family link added');

    await assert.rejects(repo.updateDraft('person', draft, { title: 'x' }), /published/);
  });
});
