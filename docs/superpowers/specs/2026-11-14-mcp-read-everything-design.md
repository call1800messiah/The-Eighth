# Claude reads the whole campaign (MCP)

## Why

Claude, connected through the MCP server, should be able to answer any question
about the campaign: "how many people are magically gifted?", "who carries the
Silberdolch?", "which quests are still open in Gareth?", "what happened in the
last combat?". Today it can't, because the tools only search by name and
`get_entity` leaves out most of a person (tags, attributes, skills, spells,
advantages, …) and everything outside people, places, quests and notes.

The database already lets the `assistant` role read every table (migration 013
for everything that existed then, 014 for the combat map). The gap is the
tools.

## Goals

- Claude can read every table the app shows, filter, sort, count and join, with
  one general tool.
- Claude can find out which tables and columns exist and what they mean.
- `get_entity` on a person returns the full sheet, readable without follow-up
  queries.

## Non-goals

- New writes. Claude still creates and edits only its own drafts.
- Free SQL (option 3 in the discussion) — rejected: an SQL-executing function
  is a large surface for little gain over PostgREST queries.
- One curated tool per feature area (option 1) — rejected: many tools, and
  anything without a tool stays invisible.
- `assets/the-eighth/rules.json`. It holds only field definitions, attributes,
  states and hit locations; the latter three are also in `allowed_attributes`,
  `combat_states`, `hit_locations`, and skills/spells/advantages are rows in
  `rules`. Nothing to add.
- Images and other storage files. Claude sees paths, not pictures.

## Anti-goals

- Claude reading the MCP server's own OAuth state (`mcp_clients`,
  `mcp_grants`, `mcp_tokens`). The assistant user has to read those for the
  OAuth server to work, so the database can't refuse them; the tool must.
- Anything that changes what players can see. No policy for `authenticated`
  users other than the assistant changes.

## Approach (picked: option 2, a general read tool)

### `query` tool

PostgREST query through the existing assistant client (`supabase-js`), so RLS
applies exactly as today.

Input:
- `table`: one of the readable tables (enum, built from the allowlist below).
- `select`: PostgREST select string, default `*`. Embedding allowed, e.g.
  `id, name, person_tags!inner(tag)` or `*, rules(name, category)`.
- `filters`: list of `{ column, op, value }`, `op` one of `eq, neq, gt, gte,
  lt, lte, like, ilike, in, is`. `column` may be a dotted path into an
  embedded table (`person_tags.tag`). Applied with `.filter()`.
- `order`: list of `{ column, ascending }`.
- `limit` (default 50, max 500), `offset`.
- `count`: `true` returns the exact total (`count: 'exact'`) alongside the
  rows; with `limit: 0` only the count.

Output: `{ count?, rows, truncated? }` as JSON. If the serialized rows exceed
~100 KB, cut the row list and say so, with a hint to narrow `select` or page
with `offset`.

Refusal: any `mcp_*` identifier in `table`, `select`, `filters` or `order` is
rejected before the request goes out (embedding could otherwise reach them
through a foreign key). PostgREST errors come back to Claude as the error
message, so it can correct its query.

### `describe` tool

Lists tables with a one-line meaning, columns (name, type, nullable,
foreign key, enum values, note) and optionally one table only.

Source: a database function `assistant_schema()` in migration 015, called
through `rpc()` with the assistant's own session. It reads `pg_catalog` and
returns only tables in `public` that have a permissive SELECT policy for the
assistant (`is_assistant()` in its condition), never `mcp_*`. So a table added
later without an assistant read policy does not show up. Meanings and pitfalls
are `COMMENT ON TABLE` / `COMMENT ON COLUMN` in the same migration (e.g.
`combat_states.state` is the state's name, `rules.metadata` holds
category-specific fields, `person_liturgies` vs. the app's `liturgys`), so they
live next to the schema and show in Studio. `SECURITY INVOKER`, executable by
`authenticated` only (the schema is in the public repo anyway).

Why not PostgREST's OpenAPI document: tried first. The production gateway
(Envoy) serves `GET /rest/v1/` only with the service-role key, deliberately
(checked 2026-11-14: 403 "RBAC: access denied" with the anon key). Reaching
PostgREST directly over the Docker network would work but goes around a gate
Supabase put there on purpose and depends on container names and PostgREST's
OpenAPI mode staying on.

### `get_entity` for a person

Adds:
- `tags`: list of strings.
- `attributes`: `{ type: { current, max } }`.
- `advantages`, `disadvantages`, `feats`: `[{ name, level?, details? }]`.
- `skills`, `spells`, `cantrips`, `liturgies`: `[{ name, value }]` (whichever
  columns the junction table has), names from `rules`.

### Instructions

Extend `INSTRUCTIONS`: for questions across the campaign, use `describe`, then
`query`; count with `count: true` rather than fetching all rows; resolve ids to
names by embedding; `search_entities`/`get_entity` stay the way to look up one
entity and to get mention links.

## Tests

- Integration (`mcp/test/tools.integration.test.ts`): filter people by tag and
  count; embedding with `!inner`; dotted filter; `limit: 0` count only;
  refusal of `mcp_tokens` as table and inside `select`; a PostgREST error comes
  back as a tool error; `describe` lists `people` with its comment and no
  `mcp_*`; `get_entity` person returns tags and capabilities with rule names.
- Database (`supabase/tests/`): `assistant_schema()` lists `people` and
  `combat_maps` with comments, foreign keys and enum values, omits `mcp_*`, a
  table without an assistant read policy, and is refused to `anon`.

## Deploy

Migration 015 by hand on production, then the new `the-eighth-mcp` image.

## Left to the builder

- Exact size cap and how truncation is reported.
- How `select` is checked for `mcp_` (token scan is enough).
- Wording of tool descriptions and comments.
