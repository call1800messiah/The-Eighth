# TheEighth MCP server

Lets Claude (claude.ai or Claude Code) look up the campaign's people, places, quests and notes during a planning chat, and add new people, places and quests as **drafts** for a GM to approve.

## What Claude can do

| Tool | |
|---|---|
| `search_entities` | Find people, places, quests and notes by name (notes also by content). Returns mention links. |
| `get_entity` | Everything about one entity: fields, text sections, related entities. |
| `create_person`, `create_place`, `create_quest` | Create a draft. Refuses a name that already exists unless `allow_duplicate` is set. |
| `link_entities` | Location of a person, parent place/quest, family. The first entity must be Claude's own draft. |
| `update_draft` | Change fields and text sections of Claude's own drafts. |

Text is Markdown with the editor's mention links (`[Alrik](mention:person/<uuid>)`), so drafts render and backlink like anything written in the app.

## How it is kept in check

Claude acts as one dedicated Supabase user with the `assistant` role (migration `013_claude_drafts.sql`). The database enforces the limits, so they hold however a request reaches it:

- **Reads** like a GM: everything, including other drafts.
- **Writes** only people, places and quests with `status = 'draft'` that it owns, plus info boxes and family links of those drafts. Every other table refuses its inserts, updates and deletes, including `document_access`, `user_roles` and storage.
- **Drafts** are invisible to everyone except GMs and the assistant, even if they're shared through `document_access`.
- A GM **publishes** a draft (`publish_draft()`: it becomes theirs, its info boxes too, and family links get their reverse), or **discards** it (`discard_draft()`), from the app's *Claude* page (`/drafts`) or the banner on the draft's page.

## Connecting (OAuth)

The server is its own small OAuth 2.1 authorization server, built on the MCP SDK's handlers:

- **Discovery:** `/.well-known/oauth-protected-resource/mcp` and `/.well-known/oauth-authorization-server`. The issuer is the app's origin.
- **Registration:** dynamic client registration accepts only `https://claude.ai/api/mcp/auth_callback` and `http://localhost|127.0.0.1|[::1]` on any port as redirect URIs. PKCE with S256 is required.
- **Authorizing** shows a login page. Only a GM account gets past it. The approval is written by the **GM's own session** (`approve_mcp_grant()` checks `is_gm()` in the database), and that session is then signed out again, locally only. The GM's password is not stored.
- **Tokens** always act as the assistant user, never as the GM. They are random, and the database (`mcp_tokens`) stores only their SHA-256 hash.
  - Access tokens last 1 hour.
  - Refresh tokens last 30 days and work once each. Presenting a used one again revokes the whole connection.
- **Revoking:** a GM can end a connection on the *Claude* page. It stops working within 30 seconds (the server caches a verified token that long).
- **Rate limits:**
  - login: 10 attempts per IP per 15 minutes, 5 per login page, plus the nginx `auth_login` zone;
  - the SDK's own limits on the other endpoints.

## Setup

1. Apply migration 013 (`bash scripts/run-migrations.sh --schema` on a fresh database, or run the file with `psql -f`).
2. Create the Claude user:
   ```bash
   bash scripts/create-mcp-user.sh claude@campaign.example.com
   ```
   This prints `MCP_SUPABASE_EMAIL` and a random `MCP_SUPABASE_PASSWORD`.
3. Set these in the Portainer stack, then redeploy:
   - `MCP_PUBLIC_URL`: the app's public origin, e.g. `https://campaign.example.com`
   - `SUPABASE_ANON_KEY`: `ANON_KEY` from `deploy/supabase/.env`
   - the two values from step 2

   Until they are set, the `mcp` container runs but answers 503.
4. Connect:
   - **claude.ai:** *Settings → Connectors → Add custom connector*, URL `https://campaign.example.com/mcp`.
   - **Claude Code:**
     ```bash
     claude mcp add --transport http the-eighth https://campaign.example.com/mcp
     ```
   Log in with a GM account when asked.

The app's nginx proxies `/mcp`, `/mcp/…` and the two `/.well-known/oauth-…` documents to this container (`the-eighth-mcp:3000` on the `supabase` network). It is not published on a port of its own.

## Development

```bash
cd mcp
npm ci
npm run typecheck
npm test                       # OAuth flow over HTTP, in-memory store
bash test/integration.sh       # tools against Postgres + PostgREST with every migration
```

`test/integration.sh` needs the Postgres server binaries (see `supabase/tests/run.sh`). It downloads PostgREST unless `POSTGREST_BIN` points at one.

Running locally against a Supabase instance:

```bash
MCP_PUBLIC_URL=http://localhost:3000 SUPABASE_URL=http://127.0.0.1:55431 \
SUPABASE_ANON_KEY=… MCP_SUPABASE_EMAIL=… MCP_SUPABASE_PASSWORD=… npx tsx src/index.ts
```
