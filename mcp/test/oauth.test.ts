import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

import { createApp } from '../src/app.js';
import { MemoryOAuthStore } from '../src/oauth/store.js';
import { TheEighthOAuthProvider, isAllowedRedirectUri } from '../src/oauth/provider.js';
import type { GmApprover } from '../src/supabase.js';
import type { EntityRepository } from '../src/tools/entities.js';

const CALLBACK = 'https://claude.ai/api/mcp/auth_callback';
const PUBLIC = new URL('https://campaign.example.com');

describe('redirect URIs', () => {
  it('accepts claude.ai and loopback only', () => {
    assert.equal(isAllowedRedirectUri(CALLBACK), true);
    assert.equal(isAllowedRedirectUri('http://localhost:33418/callback'), true);
    assert.equal(isAllowedRedirectUri('http://127.0.0.1:5000/cb'), true);
    assert.equal(isAllowedRedirectUri('https://claude.ai/api/mcp/auth_callback/../x'), false);
    assert.equal(isAllowedRedirectUri('https://evil.example/callback'), false);
    assert.equal(isAllowedRedirectUri('http://localhost.evil.example/cb'), false);
    assert.equal(isAllowedRedirectUri('https://localhost/cb'), false);
    assert.equal(isAllowedRedirectUri('not a url'), false);
  });
});

describe('OAuth flow', () => {
  let server: Server;
  let base: string;
  let store: MemoryOAuthStore;
  const approvals: string[] = [];

  // GM "gm@example.com" / "right"; "player@example.com" is not a GM.
  const approver: GmApprover = {
    async approve(email, password, clientId) {
      if (password !== 'right') return { ok: false, reason: 'invalid_credentials' };
      if (email !== 'gm@example.com') return { ok: false, reason: 'not_gm' };
      const grantId = `grant-${approvals.length + 1}`;
      store.grants.set(grantId, { clientId, revoked: false });
      approvals.push(grantId);
      return { ok: true, grantId };
    },
  };

  const repo = {
    search: async () => [{ type: 'person', id: 'p1', name: 'Alrik', status: 'published', mention: '[Alrik](mention:person/p1)' }],
    url: () => 'https://campaign.example.com/people/p1',
    reviewUrl: 'https://campaign.example.com/drafts',
  } as unknown as EntityRepository;

  before(async () => {
    store = new MemoryOAuthStore();
    const provider = new TheEighthOAuthProvider(store, approver, new URL('/mcp', PUBLIC));
    const app = createApp({ publicUrl: PUBLIC, provider, repo, rateLimits: false });
    server = app.listen(0);
    await new Promise(resolve => server.once('listening', resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  after(() => new Promise<void>(resolve => server.close(() => resolve())));

  const form = (data: Record<string, string>) => ({
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(data).toString(),
    redirect: 'manual' as const,
  });

  const mcp = (token: string | null, body: unknown) => fetch(`${base}/mcp`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  async function register(redirectUris = [CALLBACK]) {
    const res = await fetch(`${base}/mcp/oauth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ client_name: 'Claude', redirect_uris: redirectUris, token_endpoint_auth_method: 'client_secret_post' }),
    });
    return { status: res.status, body: await res.json() as any };
  }

  async function authorize(clientId: string, verifier: string, state = 'xyz') {
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    const url = new URL(`${base}/mcp/oauth/authorize`);
    url.search = new URLSearchParams({
      response_type: 'code', client_id: clientId, redirect_uri: CALLBACK,
      code_challenge: challenge, code_challenge_method: 'S256', state,
      resource: new URL('/mcp', PUBLIC).href,
    }).toString();
    const res = await fetch(url, { redirect: 'manual' });
    const html = await res.text();
    const requestId = /name="request_id" value="([^"]+)"/.exec(html)?.[1];
    return { status: res.status, html, requestId };
  }

  async function connect() {
    const { body: client } = await register();
    const verifier = randomBytes(32).toString('base64url');
    const { requestId } = await authorize(client.client_id, verifier);
    const login = await fetch(`${base}/mcp/oauth/login`, form({ request_id: requestId!, email: 'gm@example.com', password: 'right' }));
    const code = new URL(login.headers.get('location')!).searchParams.get('code')!;
    const res = await fetch(`${base}/mcp/oauth/token`, form({
      grant_type: 'authorization_code', code, code_verifier: verifier, redirect_uri: CALLBACK,
      client_id: client.client_id, client_secret: client.client_secret,
    }));
    return { client, tokens: await res.json() as any };
  }

  it('publishes discovery metadata under the app origin', async () => {
    const prm = await (await fetch(`${base}/.well-known/oauth-protected-resource/mcp`)).json() as any;
    assert.equal(prm.resource, 'https://campaign.example.com/mcp');
    assert.deepEqual(prm.authorization_servers, ['https://campaign.example.com/']);

    const as = await (await fetch(`${base}/.well-known/oauth-authorization-server`)).json() as any;
    assert.equal(as.issuer, 'https://campaign.example.com/');
    assert.equal(as.authorization_endpoint, 'https://campaign.example.com/mcp/oauth/authorize');
    assert.equal(as.registration_endpoint, 'https://campaign.example.com/mcp/oauth/register');
    assert.deepEqual(as.code_challenge_methods_supported, ['S256']);
  });

  it('asks for a token, pointing at the resource metadata', async () => {
    const res = await mcp(null, { jsonrpc: '2.0', id: 1, method: 'tools/list' });
    assert.equal(res.status, 401);
    assert.match(res.headers.get('www-authenticate')!, /resource_metadata="https:\/\/campaign\.example\.com\/\.well-known\/oauth-protected-resource\/mcp"/);
  });

  it('refuses to register foreign redirect URIs', async () => {
    const { status, body } = await register(['https://evil.example/callback']);
    assert.equal(status, 400);
    assert.equal(body.error, 'invalid_client_metadata');
  });

  it('shows a login page, and only a GM login issues a code', async () => {
    const { body: client } = await register();
    const verifier = randomBytes(32).toString('base64url');
    const page = await authorize(client.client_id, verifier, 'state-123');
    assert.equal(page.status, 200);
    assert.match(page.html, /Claude mit der Kampagne verbinden/);
    assert.match(page.html, /claude\.ai/);
    assert.ok(page.requestId);

    const wrong = await fetch(`${base}/mcp/oauth/login`, form({ request_id: page.requestId!, email: 'gm@example.com', password: 'wrong' }));
    assert.equal(wrong.status, 401);
    assert.match(await wrong.text(), /stimmt nicht/);

    const player = await fetch(`${base}/mcp/oauth/login`, form({ request_id: page.requestId!, email: 'player@example.com', password: 'right' }));
    assert.equal(player.status, 401);
    assert.match(await player.text(), /Nur ein Spielleitungs-Konto/);

    const gm = await fetch(`${base}/mcp/oauth/login`, form({ request_id: page.requestId!, email: 'gm@example.com', password: 'right' }));
    assert.equal(gm.status, 302);
    const redirect = new URL(gm.headers.get('location')!);
    assert.equal(`${redirect.origin}${redirect.pathname}`, CALLBACK);
    assert.equal(redirect.searchParams.get('state'), 'state-123');
    assert.ok(redirect.searchParams.get('code'));

    const again = await fetch(`${base}/mcp/oauth/login`, form({ request_id: page.requestId!, email: 'gm@example.com', password: 'right' }));
    assert.equal(again.status, 400, 'a login page works once');
  });

  it('locks a login page after five wrong passwords', async () => {
    const { body: client } = await register();
    const { requestId } = await authorize(client.client_id, randomBytes(32).toString('base64url'));
    for (let i = 0; i < 5; i++) {
      await fetch(`${base}/mcp/oauth/login`, form({ request_id: requestId!, email: 'gm@example.com', password: 'wrong' }));
    }
    const sixth = await fetch(`${base}/mcp/oauth/login`, form({ request_id: requestId!, email: 'gm@example.com', password: 'right' }));
    assert.equal(sixth.status, 429);
  });

  it('exchanges the code once, with the right PKCE verifier', async () => {
    const { body: client } = await register();
    const verifier = randomBytes(32).toString('base64url');
    const { requestId } = await authorize(client.client_id, verifier);
    const login = await fetch(`${base}/mcp/oauth/login`, form({ request_id: requestId!, email: 'gm@example.com', password: 'right' }));
    const code = new URL(login.headers.get('location')!).searchParams.get('code')!;
    const exchange = (codeVerifier: string) => fetch(`${base}/mcp/oauth/token`, form({
      grant_type: 'authorization_code', code, code_verifier: codeVerifier, redirect_uri: CALLBACK,
      client_id: client.client_id, client_secret: client.client_secret,
    }));

    assert.equal((await exchange('wrong-verifier-wrong-verifier-wrong-verifier-123')).status, 400);
    const ok = await exchange(verifier);
    assert.equal(ok.status, 200);
    const tokens = await ok.json() as any;
    assert.equal(tokens.token_type, 'Bearer');
    assert.ok(tokens.access_token && tokens.refresh_token);
    assert.equal((await exchange(verifier)).status, 400, 'codes are single use');

    for (const hash of store.tokens.keys()) {
      assert.notEqual(hash, tokens.access_token, 'tokens are stored hashed');
    }
  });

  it('serves tools to a valid token', async () => {
    const { tokens } = await connect();
    const list = await mcp(tokens.access_token, { jsonrpc: '2.0', id: 1, method: 'tools/list' });
    assert.equal(list.status, 200);
    const names = ((await list.json()) as any).result.tools.map((tool: any) => tool.name).sort();
    assert.deepEqual(names, ['create_person', 'create_place', 'create_quest', 'get_entity', 'link_entities', 'search_entities', 'update_draft']);

    const call = await mcp(tokens.access_token, {
      jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'search_entities', arguments: { query: 'Alr' } },
    });
    const result = ((await call.json()) as any).result;
    assert.match(result.content[0].text, /mention:person\/p1/);
  });

  it('rotates refresh tokens and revokes the connection on reuse', async () => {
    const { client, tokens } = await connect();
    const refresh = (token: string) => fetch(`${base}/mcp/oauth/token`, form({
      grant_type: 'refresh_token', refresh_token: token, client_id: client.client_id, client_secret: client.client_secret,
    }));

    const first = await refresh(tokens.refresh_token);
    assert.equal(first.status, 200);
    const next = await first.json() as any;
    assert.notEqual(next.refresh_token, tokens.refresh_token);
    assert.equal((await mcp(next.access_token, { jsonrpc: '2.0', id: 1, method: 'tools/list' })).status, 200);

    const replay = await refresh(tokens.refresh_token);
    assert.equal(replay.status, 400);
    assert.equal((await mcp(next.access_token, { jsonrpc: '2.0', id: 1, method: 'tools/list' })).status, 401, 'whole connection ended');
    assert.equal((await refresh(next.refresh_token)).status, 400);
  });

  it('stops working as soon as a GM revokes the connection', async () => {
    const { tokens } = await connect();
    const grantId = approvals[approvals.length - 1];
    // Not yet verified, so not cached: revocation applies immediately.
    store.grants.get(grantId)!.revoked = true;
    assert.equal((await mcp(tokens.access_token, { jsonrpc: '2.0', id: 1, method: 'tools/list' })).status, 401);
  });

  it('revokes through the revocation endpoint', async () => {
    const { client, tokens } = await connect();
    const res = await fetch(`${base}/mcp/oauth/revoke`, form({
      token: tokens.refresh_token, client_id: client.client_id, client_secret: client.client_secret,
    }));
    assert.equal(res.status, 200);
    assert.equal((await mcp(tokens.access_token, { jsonrpc: '2.0', id: 1, method: 'tools/list' })).status, 401);
  });

  it('rejects a token from another client\'s refresh', async () => {
    const a = await connect();
    const b = await connect();
    const res = await fetch(`${base}/mcp/oauth/token`, form({
      grant_type: 'refresh_token', refresh_token: a.tokens.refresh_token,
      client_id: b.client.client_id, client_secret: b.client.client_secret,
    }));
    assert.equal(res.status, 400);
  });
});

describe('before the assistant user is set up', () => {
  it('answers 503 with a pointer to the setup, but stays healthy', async () => {
    const store = new MemoryOAuthStore();
    const provider = new TheEighthOAuthProvider(store, { approve: async () => ({ ok: false, reason: 'error' }) }, new URL('/mcp', PUBLIC));
    const app = createApp({
      publicUrl: PUBLIC, provider, repo: {} as EntityRepository, rateLimits: false,
      ready: () => Promise.reject(new Error('The MCP user does not have the assistant role')),
    });
    const server = app.listen(0);
    await new Promise(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    try {
      const register = await fetch(`${base}/mcp/oauth/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
      assert.equal(register.status, 503);
      assert.match(((await register.json()) as any).error_description, /README/);
      assert.equal((await fetch(`${base}/mcp/health`)).status, 200);
      assert.equal((await fetch(`${base}/.well-known/oauth-authorization-server`)).status, 200);
    } finally {
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  });
});
