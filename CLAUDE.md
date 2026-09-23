# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TheEighth is an Angular 18 application for managing tabletop RPG campaigns. It uses **Supabase** (PostgreSQL + Auth + Storage + Realtime) as the backend and supports multi-tenant deployments for different game systems (e.g. The Dark Eye 5th edition, custom systems).

The app was migrated from Firebase/Firestore. Some Firebase-era naming survives in the code — `DataService` still takes a `collection` argument that is really a table name, and the `*DB` model interfaces still carry `access`/`owner` fields that `DataService.store()` strips before writing. Treat these as historical, not as a second backend.

## Common Commands

### Development
```bash
# Start dev server (http://localhost:4200)
ng serve
# or
npm start

# Build for production
ng build --configuration=production

# Run all tests
ng test

# Run a single test file
ng test --include='**/path/to/file.spec.ts'

# Headless, single run (what CI-style checks use)
ng test --watch=false --browsers=ChromeHeadless

# Type-check without emitting
npx tsc --noEmit -p tsconfig.app.json
```

There is no linter: the old tslint target has been removed and eslint is not
installed. Migrating to `@angular-eslint` is outstanding; until then use
`tsc --noEmit` as the static check. There are no e2e tests either (Protractor
was removed).

### Database
```bash
# Apply schema to a fresh Supabase instance (from the deploy root on the server)
bash scripts/run-migrations.sh --schema

# Data + storage + validation
bash scripts/run-migrations.sh

# Local: reset and reseed
npm run db:reset
```

### Deployment
The app is deployed as a Docker image alongside a separately-managed Supabase stack — **not** to Firebase Hosting.

```bash
# 1. Build the image and the deploy archive
powershell -File scripts/package-for-deploy.ps1   # Windows
bash scripts/package-for-deploy.sh                # Linux

# 2. Copy the-eighth-app.tar + the-eighth-deploy-*.tar to the server
# 3. On the server
docker load -i the-eighth-app.tar
tar xf the-eighth-deploy-*.tar
# 4. Create/update the Portainer stack from docker-compose.portainer.yml
```

See `docker-compose.portainer.yml` for the full server-side sequence, and `deploy/supabase/` for the Supabase stack itself.

## Setup Requirements

### Environment Configuration
1. Create `.env` in the root:
   ```
   NG_APP_TENANT=YOUR_TENANT_NAME
   ```

2. Create `src/environments/environment.ts` (gitignored):
   ```typescript
   export const environment = {
     name: 'dev',
     production: false,
     tenant: process.env.NG_APP_TENANT.trim(),
     tenantData: {
       YOUR_TENANT_NAME: {
         supabase: {
           url: 'http://127.0.0.1:55431',
           anonKey: 'sb_publishable_...',
         },
       },
     },
   };
   ```

3. For production, `src/environments/environment.prod.ts` has the same shape with `production: true`. Leave `supabase.url` **empty** there: the client falls back to `window.location.origin`, and the app's own nginx reverse-proxies `/rest/v1/`, `/auth/v1/`, `/realtime/v1/` and `/storage/v1/` to the Supabase gateway. That keeps the browser on a single origin with no public Supabase hostname. The anon key is baked in at build time from `deploy/supabase/.env`.

## Architecture

### Multi-Tenant System
- **Tenant selection**: `NG_APP_TENANT` in `.env`
- **Supabase config**: `environment.tenantData[environment.tenant].supabase`
- **Tenant-specific assets**:
  - Rules JSON: `assets/{tenant}/rules.json`
  - Styles: `src/scss/{tenant}.scss` (loaded globally in angular.json)
  - Body class: `document.body.classList.add(environment.tenant)`
  - Storage bucket: named after the tenant (`StorageService.bucket`)
- **Known tenants**: `tde5` (The Dark Eye 5e), `the-eighth` (custom system)

### Module Organization
- **CoreModule**: Singleton services (Api, Auth, Data, Config, Navigation, Popover, Realtime, Storage, User, Util), the Supabase client provider, app-wide layout (Header, Footer, Sidebar)
- **SharedModule**: Reusable components, directives, pipes
- **Feature Modules**: Lazy-loaded via routing (achievements, auth, combat, dice, flow, inventory, notes, overview, people, places, projects, quests, rules)

### Supabase Client
Created once in `src/app/core/providers/supabase.provider.ts` and injected via the `SUPABASE_CLIENT` token. Typed with `Database` from `src/types/supabase.ts` (generated from the schema). The auth `storageKey` is per-tenant, and the Web Locks API is deliberately bypassed to avoid `NavigatorLockAcquireTimeoutError` across tabs.

### Key Services

#### Core Services (`src/app/core/services/`)
- **ApiService**: Thin wrapper over the Supabase client — `from(table)`, `storage`, `login()`, `logout()`, `getAuthState()`
- **AuthService**: Auth state via BehaviorSubject `user$`, combining the Supabase session with the `users` row
- **DataService**: CRUD with owner handling; `store()` strips the Firebase-era `access`, `collection` and `isPrivate` fields, maps `owner` → `owner_id`, and defaults `owner_id` to the current user on insert
- **RealtimeService** (`supabase-realtime.service.ts`): Wraps Supabase realtime as `watch()` / `watchOne()`, with a re-fetch-on-change model
- **UserService**: User directory from the `users` table
- **StorageService**: Supabase Storage upload/download against the tenant bucket
- **ConfigService**: App config, sidebar state (localStorage), ID generation (nanoid)
- **NavigationService**, **PopoverService**, **UtilService**: unchanged from before the migration

#### Feature Services
- **PeopleService**: Deserializes people + places + rules, resolves relationships and rule references, and writes capabilities to their junction tables
- **RulesService**: Static rules from `assets/{tenant}/rules.json` + dynamic rules from the `rules` table
- **CombatService**, **CampaignService**, **TimelineService**, **FlowService**: per-feature CRUD

### State Management Pattern
- **No NgRx/Akita**: RxJS BehaviorSubjects in services
- **Data flow**: RealtimeService → Feature Services (deserialize/transform/combine) → BehaviorSubjects → Components
- **Reactive composition**: `combineLatest` / `withLatestFrom`

### Realtime
`RealtimeService.watch(table, queryFn, cacheKey, triggerTables)` re-runs the query when the watched table changes. **`triggerTables` matters for junction tables**: a write to `person_skills` changes no `people` row, so without listing it there the UI only updates after a reload. A table must also be a member of the `supabase_realtime` publication for any event to fire — see `supabase/migrations/004_person_capability_realtime.sql`.

### Access Control
- **Enforced by RLS in the database**, not by client-side query filters
- **`document_access` table** for explicit per-document sharing (not owners, not GMs)
- **Owners** (`owner_id`) and **GMs** (`is_gm()`, via `user_roles`) are handled inside the policies
- **Do not** add access filters in queries — RLS already scopes results. A query that returns too much is a policy bug, not a client bug.
- All 39 tables have RLS enabled; policies live in `supabase/migrations/002_rls_policies.sql`

### Database Schema
`supabase/migrations/` holds the schema, applied in filename order by `scripts/run-migrations.sh --schema`. There is no migration-tracking table on the production path — the files are a build script, so they are applied once to a fresh database.

- `001_initial_schema.sql` — enums, tables, indexes, replica identity, realtime publication
- `002_rls_policies.sql` — helper functions (`is_gm()`, `is_entity_owner()`) and every policy
- `003_storage_buckets.sql` — bucket and storage.objects policies
- `004_…` onward — incremental changes

Junction tables replace Firestore's `Record<id, value>` maps (`person_skills`, `project_milestones`, …). Query them with PostgREST embedding: `query.select('*, person_skills(rule_id, value)')`.

### Routing
- **All routes lazy-loaded** except `auth`
- **Protected by `AuthGuardService`** (canLoad)
- **Default redirect**: `/` → `/overview`

### Component Patterns
- **Dashboard Pattern**: most features use the shared `DashboardComponent` as a layout wrapper
- **Popover-based editing**: edit forms loaded dynamically via PopoverService with props passed via resolver
- **Shared Components** (`src/app/shared/components/`): EditImage, EditInfo, EditAttribute, EditAccess, EditTags, Avatar, Bar, InfoBox, Timeline, ProgressBar, Popover, ContextMenu, TopBarFilter, Container

### Dependency Injection
All services use `providedIn: 'root'`.

## Important Patterns

### When Creating New Features
1. Follow the existing module structure: `components/`, `models/`, `services/`, routing module, feature module
2. Use `DataService` for plain CRUD; go through `ApiService.from()` for junction tables and anything needing joins
3. Lazy-load via routing, protect with `AuthGuardService`
4. Emit state changes via BehaviorSubjects

### When Adding Tables or Policies
- Add a new numbered migration; never edit an applied one
- Enable RLS on every new table — an un-policied table is invisible to clients, and a table with RLS off is readable by everyone
- If the app should react to changes, add the table to the `supabase_realtime` publication *and* to the relevant `triggerTables`

### When Working with Supabase
- `.then()` on a query builder returns a `PromiseLike`, not a `Promise` — use `async`/`await`
- `api.from()` may need an `as any` cast when the generated types lag the schema
- `.select().single()` then needs `as { data: any; error: any }`
- Check `{ data, error }` on every call; there are no thrown rejections

### Naming Mismatches to Watch
- DB columns are snake_case, TypeScript is camelCase — mapped in each service's transform/store methods
- `CombatState` has `.name`; the DB column is `state`
- The `liturgy` rule type maps to the `person_liturgies` table, but the `Person` field is `liturgys`

### Styling
- Component styles use SCSS
- Global: `src/scss/styles.scss`; tenant-specific: `src/scss/{tenant}.scss`
- Tenant body class scopes CSS: `.{tenant} .your-selector`

## Testing
- Jasmine + Karma, Chrome by default
- Coverage: `./coverage/The-Eighth/`
- Tests live beside sources as `*.spec.ts`
- **The suite is green** (328 passing as of 2026-09-22). Keep it that way — a red suite gets ignored, which is how capability add/delete stayed broken in production.

### Writing specs against Supabase
Use the helpers in `src/app/testing/supabase-test-helpers.ts` rather than hand-rolling mocks. Two failure modes account for most breakage:

- **`NullInjectorError: No provider for InjectionToken SupabaseClient`** — something in the dependency chain injects `ApiService` or `RealtimeService`. Provide a mock for whichever one it is; don't provide the raw client unless testing `RealtimeService` itself. A whole suite dying in `beforeEach` shows up as *every* test failing with zero passing, so check that first.
- **Assertions on `realtime.watch` arguments** — `watch()` takes a fourth `triggerTables` argument. `toHaveBeenCalledWith` is an exact match, so a spec asserting three arguments fails the moment a service starts passing trigger tables.

Fixtures must match the current schema: type-specific rule fields live in `rules.metadata`, not as top-level columns.

## Quality Standards

### Line Endings
`.gitattributes` pins everything to LF. Files under `deploy/` and `scripts/` are bind-mounted into Linux containers, where a CRLF `set -e` fails under dash with `set: Illegal option -`. Never commit CRLF.

### Security & Privacy
- **User ID Exposure**: Do not unnecessarily expose user/owner IDs in file paths, URLs, or other client-visible locations
  - **Bad**: `/storage/users/{userId}/avatar.jpg` — exposes user ID in path
  - **Good**: `/storage/avatars/{randomId}.jpg` — uses a non-identifying random ID
  - **Rationale**: user IDs are internal identifiers; exposing them invites enumeration and unintended disclosure
- **RLS role qualifiers**: a policy with `USING (true)` and no `TO` clause also applies to the `anon` role. Scope directory-style tables to `authenticated` (see `users_select_policy`).
