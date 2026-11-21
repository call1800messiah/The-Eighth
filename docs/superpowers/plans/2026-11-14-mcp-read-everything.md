# Claude Reads the Whole Campaign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the MCP server a general read tool (`query`), a schema tool (`describe`) and a full person sheet in `get_entity`, so Claude can answer any question about the campaign.

**Architecture:** `describe` reads the schema from a database function `assistant_schema()` (migration 015: tables the assistant may read, columns, foreign keys, enum values, and `COMMENT`s that explain them), cached per process. `query` turns a structured request into a PostgREST query through the existing assistant client, so RLS applies unchanged. Both refuse anything naming an `mcp_*` table.

**Tech Stack:** TypeScript (ESM), `@modelcontextprotocol/sdk`, `@supabase/supabase-js`, zod, `node:test` via `tsx`.

**Spec:** `docs/superpowers/specs/2026-11-14-mcp-read-everything-design.md`

## Global Constraints

- One migration, `015_assistant_schema.sql`; no change to any RLS policy.
- `mcp_clients`, `mcp_grants`, `mcp_tokens` (any identifier starting `mcp_`) never readable through `query` or listed by `describe`, including via embedding.
- `limit` default 50, max 500. Result cap ~100 KB serialized (`MAX_RESULT_BYTES = 100_000`).
- Filter ops exactly: `eq, neq, gt, gte, lt, lte, like, ilike, in, is`.
- PostgREST errors reach Claude as tool errors (`ToolError`), not as the generic server-error message.
- Existing tools keep their behavior; all existing tests stay green.
- LF line endings.

## Review Focus

1. A hidden table reached through an embedding alias, e.g. `select: "g:mcp_grants(*)"` or `users(mcp_grants(*))` → refused before any request. (Task 3 test)
2. An `in` filter whose values contain commas, quotes or parentheses (`["Gareth, Stadt", "a\"b"]`) → matched literally, not split. (Task 3 test)
3. A single row larger than the cap (a long note) → returns zero rows plus a `truncated` message telling Claude to narrow `select`, never an oversized response. (Task 3 test)
4. The schema call fails once (gateway restarting) → `describe`/`query` give a tool error, and the next call fetches again instead of reusing the failure. (Task 2 test)
5. Claude asks for an unknown table or column → a tool error naming the problem and pointing to `describe`. (Task 3 test)

---

### Task 1: Check the production gateway passes the schema document

Done 2026-11-14: Envoy answers `GET /rest/v1/` with 403 "RBAC: access denied" unless the service-role key is sent (`deploy/supabase/volumes/api/envoy/lds.template.yaml`, route `rest-v1-openapi-protected`). Per the spec's fallback, Task 2 builds the schema from migration 015 instead.

---

### Task 2: Schema from the database (migration 015) and the catalog

**Files:**
- Create: `supabase/migrations/015_assistant_schema.sql`
- Create: `supabase/tests/015_assistant_schema.test.sql`
- Create: `mcp/src/tools/schema.ts`
- Test: `mcp/test/schema.test.ts`
- Modify: `CLAUDE.md` (*When Adding Tables or Policies*: add a `COMMENT ON TABLE` for Claude's `describe`; *Database Schema* list: `015` assistant schema)

**Interfaces:**
- Produces (SQL): `public.assistant_schema() RETURNS jsonb`, `LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, pg_catalog`; `REVOKE ALL ... FROM PUBLIC, anon`; `GRANT EXECUTE ... TO authenticated`. Returns a JSON array sorted by table name:
  `[{ "name": text, "note": text|null, "columns": [{ "name", "type" (format_type), "nullable": bool, "references": "table.column"|null, "values": [enum labels]|null, "note": text|null }] }]` (columns in attnum order, dropped columns skipped). Tables: `public`, `relkind = 'r'`, RLS on, `relname NOT LIKE 'mcp\_%'`, and an entry in `pg_policies` for that table with `permissive = 'PERMISSIVE'`, `cmd IN ('SELECT','ALL')` and `qual LIKE '%is_assistant()%'`. Foreign keys: single-column `pg_constraint` `contype = 'f'` only.
- Comments (same migration): `COMMENT ON TABLE` for every table the function returns (one line, German game terms where the app uses them), and `COMMENT ON COLUMN` at least for `rules.metadata` (category-specific fields such as cost, castingTime, attributes), `rules.category`, `combat_states.state` (the state's name; the app calls it `name`), `info_boxes.type`/`entity_type`/`entity_id`, `people.status`/`places.status`/`quests.status` (draft or published), `person_attributes.type` (e.g. lep, asp), and a table comment on `person_liturgies` noting the app's field is `liturgys`. Capability junction tables share one wording: "A person's <kind>; rule_id -> rules (name, category)."
- Produces (TS, `schema.ts`):
  ```ts
  export interface ColumnInfo { name: string; type: string; nullable: boolean; references: string | null; values: string[] | null; note: string | null }
  export interface TableInfo { name: string; note: string | null; columns: ColumnInfo[] }
  export function isHiddenIdentifier(text: string): boolean   // an identifier starting "mcp_", case-insensitive, word boundary
  export class SchemaCatalog {
    constructor(db: () => Promise<SupabaseClient>);
    tables(): Promise<TableInfo[]>;              // rpc('assistant_schema'); cached after first success; a failure is not cached and becomes ToolError('Could not read the database schema: <message>')
    table(name: string): Promise<TableInfo | undefined>;
  }
  ```
  `tables()` drops any `mcp_*` name again (defense in depth).

- [ ] **Step 1: Write the failing database test** `supabase/tests/015_assistant_schema.test.sql` (style of `014_combat_map.test.sql`, in `BEGIN ... ROLLBACK`):
  - as `:claude`: result contains `people` with a non-null `note`; `people.location_id.references = 'places.id'`; `rules.category.values` contains `advantage`; `combat_maps` is listed; no name `LIKE 'mcp\_%'`.
  - as superuser create `t_unread (id int)` with RLS on and no policy, then as `:claude` it is not listed.
  - as `anon` (`test.login(NULL)`): `test.denied('SELECT assistant_schema()', ...)`.
- [ ] **Step 2: Run** `bash supabase/tests/run.sh` — Expected: FAIL (function does not exist). Needs Postgres binaries; on this machine run it inside a `postgres` container with the repo mounted.
- [ ] **Step 3: Write `015_assistant_schema.sql`** per the interface above.
- [ ] **Step 4: Run** `bash supabase/tests/run.sh` — Expected: all files pass.
- [ ] **Step 5: Write the failing unit tests** in `mcp/test/schema.test.ts` with a fake client whose `rpc` returns a sample array (`people`, `person_tags`, `mcp_tokens`):
  - `isHiddenIdentifier` → true for `'mcp_tokens'`, `'g:mcp_grants(*)'`, `'users(MCP_grants(*))'`; false for `'people'`, `'campaign'`, `'xmcp_a'`.
  - `catalog drops mcp_ tables` → names `['people','person_tags']`.
  - `catalog caches success` → `rpc` called once across two `tables()` calls.
  - `catalog retries after a failure` → first `rpc` returns `{ error: { message: 'down' } }`, `tables()` rejects with `ToolError` mentioning `down`; second call resolves; `rpc` called twice.
- [ ] **Step 6: Run** `cd mcp && node --import tsx --test test/schema.test.ts` — Expected: FAIL (module not found).
- [ ] **Step 7: Implement `schema.ts`.**
- [ ] **Step 8: Run** the same command and `npm run typecheck` — Expected: pass.
- [ ] **Step 9: Commit** `git add supabase/migrations/015_assistant_schema.sql supabase/tests/015_assistant_schema.test.sql mcp/src/tools/schema.ts mcp/test/schema.test.ts CLAUDE.md docs/superpowers && git commit -m "Describe the readable schema to Claude (migration 015)"`

---

### Task 3: `QueryReader`: structured queries through PostgREST

**Files:**
- Create: `mcp/src/tools/query.ts`
- Test: `mcp/test/query.test.ts` (unit), `mcp/test/tools.integration.test.ts` (new `describe('query', …)` block)

**Interfaces:**
- Consumes: `SchemaCatalog`, `TableInfo`, `isHiddenIdentifier` (Task 2); `ToolError` from `entities.ts`.
- Produces:
  ```ts
  export const FILTER_OPS = ['eq','neq','gt','gte','lt','lte','like','ilike','in','is'] as const;
  export type FilterOp = typeof FILTER_OPS[number];
  export type FilterValue = string | number | boolean | null | (string | number)[];
  export interface QueryInput {
    table: string; select?: string;
    filters?: { column: string; op: FilterOp; value: FilterValue }[];
    order?: { column: string; ascending?: boolean }[];
    limit?: number; offset?: number; count?: boolean;
  }
  export interface QueryResult { count?: number; rows: unknown[]; truncated?: string }
  export const DEFAULT_LIMIT = 50, MAX_LIMIT = 500, MAX_RESULT_BYTES = 100_000;
  export function inList(values: (string | number)[]): string      // PostgREST "(a,"b, c")" with double-quote/backslash escaping
  export function fitRows(rows: unknown[], maxBytes: number): { rows: unknown[]; truncated?: string }
  export class QueryReader {
    constructor(db: () => Promise<SupabaseClient>, catalog: SchemaCatalog, maxBytes?: number);
    describe(table?: string): Promise<TableInfo[]>;   // all tables, or [one]; unknown name → ToolError listing nothing but "Unknown table X. Call describe without a table to list them."
    query(input: QueryInput): Promise<QueryResult>;
  }
  ```

Behavior of `query`:
1. Reject with `ToolError` if `isHiddenIdentifier` matches `table`, `select`, any filter column or order column ("Not readable: the MCP server's connection tables.").
2. Reject unknown `table` (not in `catalog.tables()`) with a ToolError pointing to `describe`.
3. `limit` clamped to `[0, MAX_LIMIT]`, default `DEFAULT_LIMIT`. `limit: 0` → `.select(select, { count: 'exact', head: true })`, returns `{ count, rows: [] }`.
4. Otherwise `.select(select ?? '*', count ? { count: 'exact' } : undefined)`, each filter via `.filter(column, op, value)` where `in` uses `inList(value)` and `is` accepts only `null | true | false` (else ToolError), `.order(column, { ascending })`, `.range(offset, offset + limit - 1)`.
5. PostgREST `error` → `ToolError(\`${error.message}${error.hint ? ' — ' + error.hint : ''}\`)`.
6. Rows through `fitRows(rows, maxBytes)`; the message says how many of how many rows fit and to narrow `select` or page with `offset`. If not even one row fits, rows are `[]`.

- [ ] **Step 1: Write the failing unit tests** in `mcp/test/query.test.ts`:
  - `inList quotes values with commas, quotes and parentheses` → `inList(['Gareth, Stadt', 'a"b', 'x(y)', 3])` equals `'("Gareth, Stadt","a\\"b","x(y)",3)'`.
  - `fitRows keeps everything under the cap` → 3 small rows, no `truncated`.
  - `fitRows cuts at the cap` → 10 rows of ~30 bytes, cap 100 → fewer rows, `truncated` mentions `10`.
  - `fitRows returns no rows when one row is too big` → one 500-byte row, cap 100 → `rows: []`, `truncated` set.
  - `query refuses mcp_ tables before calling the database` → `QueryReader` with a db function that throws if called; inputs `{ table: 'mcp_tokens' }`, `{ table: 'users', select: 'g:mcp_grants(*)' }`, `{ table: 'people', filters: [{ column: 'mcp_grants.id', op: 'eq', value: 'x' }] }` each reject with `ToolError`.

- [ ] **Step 2: Write the failing integration tests** (new `describe('query', …)` in `tools.integration.test.ts`, catalog `new SchemaCatalog(async () => claude)`, reader as `new QueryReader(async () => claude, catalog)`). In its `before`, as GM insert: two people tagged `magiebegabt` (one also `adlig`), one untagged; a `rules` row `{ category: 'advantage', name: 'Zauberer' }` and a `person_advantages` row for one tagged person.
  - `counts people by tag` → `{ table: 'people', select: 'id, person_tags!inner(tag)', filters: [{ column: 'person_tags.tag', op: 'eq', value: 'magiebegabt' }], count: true, limit: 0 }` → `count === 2`, `rows` empty.
  - `embeds rule names` → `{ table: 'person_advantages', select: 'level, people(name), rules(name)' }` → a row with `rules.name === 'Zauberer'`.
  - `filters with in` → people with `name` `in` both tagged names → 2 rows.
  - `sees drafts` → a draft person created by Claude appears in `{ table: 'people', filters: [{ column: 'status', op: 'eq', value: 'draft' }] }`.
  - `unknown column comes back as a tool error` → `{ table: 'people', select: 'nope' }` rejects with `ToolError` whose message mentions `nope`.
  - `unknown table points to describe` → `{ table: 'dragons' }` rejects, message contains `describe`.
  - `describe lists people with notes and no mcp_ tables` → `describe()` contains `people` with a `note`, and no name starting `mcp_`; `describe('person_tags')` shows `person_id.references === 'people.id'`.

- [ ] **Step 3: Run** `cd mcp && npm test` — Expected: new unit tests FAIL (module not found). Integration runs in Step 6.

- [ ] **Step 4: Implement `query.ts`** per the interfaces and behavior above.

- [ ] **Step 5: Run** `npm test` and `npm run typecheck` — Expected: pass.

- [ ] **Step 6: Run** `bash mcp/test/integration.sh` — Expected: all pass. It needs Postgres binaries (`initdb`) and Linux PostgREST; if this machine can't run it, say so in the task report rather than skipping silently.

- [ ] **Step 7: Commit** `git add mcp/src/tools/query.ts mcp/test/query.test.ts mcp/test/tools.integration.test.ts && git commit -m "Add a general read query for the MCP server"`

---

### Task 4: Register `describe` and `query`, wire them in, update instructions and docs

**Files:**
- Modify: `mcp/src/tools/register.ts` (`createMcpServer(repo, reader)`, two tools, `INSTRUCTIONS`)
- Modify: `mcp/src/app.ts` (`AppOptions.reader: QueryReader`, passed to `createMcpServer`)
- Modify: `mcp/src/index.ts` (`new QueryReader(() => session.ready(), new SchemaCatalog(() => session.ready()))`)
- Modify: `mcp/test/oauth.test.ts` (pass `reader: {} as QueryReader` to both `createApp` calls)
- Modify: `mcp/test/tools.integration.test.ts` (`createMcpServer(repo, reader)`; reader built in the outer `before`)
- Modify: `mcp/README.md` (tools table, "How it is kept in check": `mcp_*` refused by the tool), `mcp/package.json` description, `CLAUDE.md` *Claude (MCP server)* section (one bullet: reads every table via `query`/`describe`; the tool refuses `mcp_*` because the DB can't)

**Interfaces:**
- Consumes: `QueryReader`, `FILTER_OPS` (Task 3).
- Produces: tools `describe` (input `{ table?: string }`) and `query` (input mirrors `QueryInput`; `table` is a free string validated by the reader, since the table list is fetched at runtime — my call, deviates from the spec's "enum"). Both `annotations: { readOnlyHint: true, openWorldHint: false }`, both wrapped in `run()`.

Tool descriptions must tell Claude: `query` uses PostgREST select syntax with embedding (`person_tags!inner(tag)` to filter parents by a child), dotted filter columns for embedded tables, `count: true` + `limit: 0` for "how many", ids → names by embedding (e.g. `rules(name)`), max 500 rows.

`INSTRUCTIONS` gains a paragraph: for questions across the campaign, call `describe` then `query`; count instead of fetching everything; `search_entities`/`get_entity` remain the way to look up one entity and to get mention links; the first sentence changes from "look up … people, places, quests and notes" to reading the whole campaign.

- [ ] **Step 1: Write the failing integration test** `MCP: query and describe are tools` → via `mcp.listTools()` both names present; `call('query', { table: 'people', select: 'name', filters: [{ column: 'name', op: 'eq', value: 'Gareth' }] })` returns parsed `{ rows: [] }`; `call('query', { table: 'mcp_tokens' })` returns `isError: true`.

- [ ] **Step 2: Implement** the registrations, wiring and doc changes listed above.

- [ ] **Step 3: Run** `cd mcp && npm test && npm run typecheck && npm run build` — Expected: pass, including `oauth.test.ts`.

- [ ] **Step 4: Run** `bash mcp/test/integration.sh` — Expected: pass (same caveat as Task 3).

- [ ] **Step 5: Commit** `git add mcp CLAUDE.md && git commit -m "Let Claude query and describe the whole campaign"`

---

### Task 5: Full person sheet in `get_entity`

**Files:**
- Modify: `mcp/src/tools/entities.ts` (`get()` for `person`, new private `sheet(id)`)
- Modify: `mcp/src/tools/register.ts` (`get_entity` description mentions tags, attributes, capabilities)
- Test: `mcp/test/tools.integration.test.ts`

**Interfaces:**
- Produces: `get('person', id)` additionally returns
  ```ts
  tags: string[];
  attributes: Record<string, { current: number; max: number }>;
  advantages: { name: string; level?: string; details?: string }[];   // same shape: disadvantages, feats
  skills: { name: string; value: number }[];                          // same shape: spells, cantrips, liturgies
  ```
  Empty lists/objects are included. Lists sorted by `name`. `level`/`details` omitted when null. One PostgREST request: `people` with embedded `person_tags(tag), person_attributes(type,current,max), person_advantages(level,details,rules(name)), …` for all seven capability tables.

- [ ] **Step 1: Write the failing integration test** `get_entity returns the full person sheet` → as GM give Alrik tags `händler`, `magiebegabt`; attribute `lep` 30/32; advantage rule `Zauberer` with `level: 'I'`; a `skill` rule `Handel` value 12. `repo.get('person', alrik)` → `tags` deep-equals `['händler','magiebegabt']` (sorted), `attributes.lep` deep-equals `{ current: 30, max: 32 }`, `advantages` deep-equals `[{ name: 'Zauberer', level: 'I' }]`, `skills` deep-equals `[{ name: 'Handel', value: 12 }]`, `spells` deep-equals `[]`.

  Reuse the Task 3 fixture rows where they fit; don't insert a second `Zauberer` rule if one exists (unique constraints, if any).

- [ ] **Step 2: Run** `bash mcp/test/integration.sh` — Expected: the new test FAILS (`tags` undefined).

- [ ] **Step 3: Implement `sheet(id)`** and merge it into `get()` for persons.

- [ ] **Step 4: Run** `bash mcp/test/integration.sh`, `cd mcp && npm test && npm run typecheck` — Expected: pass.

- [ ] **Step 5: Commit** `git add mcp && git commit -m "Show a person's full sheet in get_entity"`

---

### Task 6: Final verification

- [ ] **Step 1:** `cd mcp && npm test && npm run typecheck && npm run build` — all pass.
- [ ] **Step 2:** `bash mcp/test/integration.sh` — all pass (or reported as not runnable here, with the reason).
- [ ] **Step 3:** `git status` clean; `git log --oneline` shows Tasks 1–5's commits.
- [ ] **Step 4:** Deploy note for the user: apply `015_assistant_schema.sql` by hand, then package, load, recreate the `mcp` container. Also apply 015 to the local dev DB.
