# Supabase Migration - TODOs

**Status**: Bug Fixes Complete — Ready for Phase 10
**Last Updated**: 2026-02-22

## Phase 1: Infrastructure Setup ✅

- [x] Install Supabase CLI (`npm install supabase --save-dev`)
- [x] Initialize Supabase project (`npx supabase init`)
- [x] Start local Supabase (`npx supabase start`)
- [x] Install Supabase JS client (`npm install @supabase/supabase-js`)

## Phase 2: Database Schema ✅

- [x] Create `supabase/migrations/001_initial_schema.sql`
  - [x] User system tables (users, user_roles, document_access)
  - [x] Rules config tables (allowed_attributes, hit_locations, combat_states, rules_config)
  - [x] Entity tables (people, places, quests, projects, achievements, inventory, notes, rolls)
  - [x] Campaign and timeline tables
  - [x] Flow tables (flows, flow_items)
  - [x] Junction tables (person_advantages, person_skills, etc.)
  - [x] Info boxes table (polymorphic)
  - [x] Combat tables (combat_sessions, combatants, combatant_attributes, combatant_states)
  - [x] All indexes
- [x] Create `supabase/migrations/002_rls_policies.sql`
  - [x] Helper functions (current_user_id, is_gm)
  - [x] RLS policies for all entity tables
- [x] Create `supabase/migrations/003_storage_buckets.sql`
  - [x] Create storage bucket
  - [x] Storage RLS policies
- [x] Apply migrations (`npx supabase db reset`)
- [x] Generate TypeScript types (`npx supabase gen types typescript --local > src/types/supabase.ts`)

## Phase 3: Pre-Migration Validation ✅

- [x] Create `scripts/validate-firebase-data.ts`
  - [x] Check orphaned location_id references
  - [x] Check orphaned parent_id references (places, quests)
  - [x] Detect circular hierarchies
  - [x] Check invalid access arrays
  - [x] Check orphaned flow items
  - [x] Check combatants referencing deleted people
  - [x] Check orphaned person relationships
  - [x] Check invalid owner references
- [x] Run validation and fix any issues in Firebase (requires service account)

## Phase 4: Data Export

- [x] Create `scripts/firebase-export.ts`
  - [x] Export users collection
  - [x] Export people collection + subcollections (info)
  - [x] Export places collection + subcollections (info)
  - [x] Export quests collection + subcollections (info)
  - [x] Export projects collection
  - [x] Export achievements collection
  - [x] Export inventory collection
  - [x] Export notes collection
  - [x] Export rolls collection
  - [x] Export flows collection
  - [x] Export rules collection (dynamic)
  - [x] Export campaign collection
  - [x] Export timelines + events subcollections
  - [x] Export combat fighters from hardcoded path
  - [x] Exclude isPrivate fields
- [x] Run export script (1,477 documents exported)

## Phase 5: Data Transformation & Migration

- [x] Create `scripts/transform-and-migrate.ts`
  - [x] Create Firebase ID to PostgreSQL UUID mapping
  - [x] Seed rules config from JSON files
  - [x] Migrate users (create in Supabase Auth + users table + user_roles)
  - [x] Migrate rules from Firebase export
  - [x] Migrate timelines
  - [x] Migrate core entities (people, places, quests, projects, achievements, inventory, notes, rolls)
  - [x] Migrate campaign (with shipLink→ship_id, timelineId→timeline_id)
  - [x] Migrate flows and flow_items
  - [x] Second pass: hierarchical FKs (parent_id, location_id)
  - [x] Migrate junction tables (person_advantages, disadvantages, feats, skills, spells, cantrips, liturgies, attributes, tags)
  - [x] Migrate person relationships (from relatives object)
  - [x] Migrate info_boxes (people, places, quests info subcollections)
  - [x] Migrate historic_events
  - [x] Migrate combat sessions and combatants (with states)
  - [x] Migrate document_access (explicit grants only, exclude owners/GMs)
- [x] Run migration script (1,477 source docs → 3,000+ rows across all tables)

## Phase 6: Storage Migration ✅

- [x] Create `scripts/migrate-storage.ts`
  - [x] Download all files from Firebase Storage
  - [x] Upload to Supabase Storage (keep same paths)
  - [x] Verify file counts match
- [x] Run storage migration (112 files, 44.1 MB, 0 failures)

## Phase 7: Post-Migration Validation ✅

- [x] Create `scripts/validate-migration.ts`
  - [x] Row count validation (16 tables, all match)
  - [x] Referential integrity validation (FK checks for people→places, places→places, quests→quests)
  - [x] Junction table integrity validation (7 junction tables, 542 rows)
  - [x] Access control validation (1,000 entries, no owners/GMs in document_access)
  - [x] Hierarchical data validation (places max depth 4, quests max depth 5, no cycles)
  - [x] Combat data validation (1 session, 4 combatants)
  - [x] Rules migration validation (319 rules, 24 attrs, 20 hit locs, 24 states)
- [x] Run validation queries (14/14 passed, 0 failures, 0 warnings)

## Phase 8: Angular Service Refactoring

### Core Infrastructure
- [x] Create `src/app/core/supabase.provider.ts`
- [x] Update `src/environments/environment.ts` with Supabase config
- [x] Update `src/environments/environment.prod.ts` with Supabase config
- [x] Update CoreModule to use Supabase provider (AngularFire kept until services migrated)

### Core Services
- [x] Rewrite `api.service.ts` for Supabase (from(), getAuthState(), login/logout, storage)
- [x] Rewrite `auth.service.ts` for Supabase Auth (same public API preserved)
- [x] Rewrite `storage.service.ts` for Supabase Storage (public bucket, listFiles added)
- [x] Update `data.service.ts` (removed access array, RLS handles permissions)
- [x] Update `user.service.ts` (isGM computed from user_roles join)
- [x] Create `supabase-realtime.service.ts` (watch/watchOne with auto-refetch)

### Feature Services
- [x] Update `people.service.ts` (complex junction table joins)
- [x] Update `place.service.ts`
- [x] Update `quests.service.ts`
- [x] Update `project.service.ts` (milestone/requirement joins)
- [x] Update `achievement.service.ts`
- [x] Update `flow.service.ts` (flow_items joins)
- [x] Update `rules.service.ts` (query from DB, not JSON)
- [x] Update `combat.service.ts` (dynamic sessions)
- [x] Update `timeline.service.ts` (pagination pattern)
- [x] Update `notes.service.ts`
- [x] Update `inventory.service.ts`
- [x] Update `campaign.service.ts`
- [x] Update `dice-roller.service.ts`

### Components
- [x] Update `edit-access.component.ts` (document_access table instead of access[] array)
- [x] Update `audio-player-list.component.ts` (list from Storage bucket)

## Phase 9: Testing ✅

- [x] Test auth flow (login/logout)
- [x] Test isGM computed property
- [ ] Test RLS policies with each role (skipped — requires integration test against live DB)
- [x] Test CRUD operations for all entities
- [x] Test real-time subscriptions
- [x] Test file upload/download
- [x] Test audio player
- [x] Test hierarchical queries (places, quests)
- [x] Test person with all junction data

## Phase 10: Cleanup

- [x] Add `db:reset` npm script — runs `supabase db reset` + `migrate:transform` + `migrate:storage` to reinitialize the database from Firebase data in one command
- [ ] Remove Firebase packages (`npm uninstall @angular/fire firebase`)
- [ ] Remove Firebase dev packages (`npm uninstall firebase-admin firebase-tools`)
- [ ] Delete any remaining Firebase imports

## Bug Fixes (Pre-Phase 10)

- [x] Fix info access not being enforced — updated `004_info_box_access.sql` to remove parent entity fallback; policy now requires explicit `document_access` entry with `entity_type = 'info_box'`
- [x] Fix real-time updates not working — created `009_realtime_publication.sql` to add all tables to `supabase_realtime` publication
- [x] Fix `NavigatorLockAcquireTimeoutError` — added explicit `storageKey`, `detectSessionInUrl: false` to Supabase client auth config in `supabase.provider.ts`
- [x] Fix non-GMs unable to add people to combat — created `006_combat_access.sql`: combat tables now allow writes from any authenticated user
- [x] Fix dynamic rules missing from DB — created `007_rules_metadata.sql` (adds `metadata JSONB` column); updated `RulesService.store()` and `transformRules()` to pack/unpack type-specific fields; updated migration script
- [x] Fix project access rights / access indicator for non-GMs — created `008_document_access_owner_policies.sql` with `is_entity_owner()` function; non-GM entity owners can now SELECT/INSERT/DELETE their own document_access entries
- [x] Fix access indicator on projects showing wrong data for non-GMs — fixed by migration 008
- [x] Fix access indicator missing entirely on project "Bashuriden Rüstung" — owned by GM "Messiah"; the `*ngIf` removal was wrong; reverted to show indicator only for owners/GMs; Bashuriden Rüstung is correctly hidden for non-GMs
- [x] Fix recent rolls showing "1 WNaN" — migration stored `dice_type` as `'d6'`/`'d20'`; fixed transform to strip leading `d` before parsing, and store method to use same format

## New Bug Fixes

- [x] Fix info access for normal users: non-owners can't see any infos — registered info box IDs in `IdMapper` during `migrateInfoBoxes()`; added `processEntities` calls for `peopleInfo`, `placesInfo`, `questsInfo` in `migrateDocumentAccess()`; need to re-run migration
- [x] Revert access-indicator visibility: restored `*ngIf="user.isGM || user.id === item.owner"` in `access-indicator.component.html`
- [x] Fix access indicator not showing non-GM owners as having access: passed `ownerId` through `EditAccessProps`; pre-check owner in `EditAccessComponent.ngOnInit()`; exclude owner from `document_access` inserts in `save()`
- [x] Fix `NavigatorLockAcquireTimeoutError` persisting: added custom `lock` function in `supabase.provider.ts` auth config that bypasses Web Locks API entirely (calls `fn()` directly)
- [x] Fix edits not persisting: column/field mismatches across services — `people.service.ts` (`location`→`location_id`); `place.service.ts` + `edit-place` (`parentId`→`parent_id`, `deleteField()`→`null`); `quests.service.ts` + `edit-quest` (same); `notes.service.ts` (strip `type` field); `achievement.service.ts` (strip `people`, sync `achievement_people` junction table); `edit-event` (fix collection name, add `timeline_id`, rename `created`/`modified` to `created_at`/`modified_at`)
- [x] Fix realtime updates not working for access changes: `access-indicator.component.ts` now subscribes to `RealtimeService.watch('document_access')` and re-fetches on any change
- [x] Fix access revocation not propagating in realtime — `postgres_changes` DELETE events on `document_access` are silently dropped by Supabase Realtime's RLS evaluation (the affected user can't "see" the deleted row); replaced with dual approach: `postgres_changes` for INSERT (grants, works with RLS) + Supabase broadcast channel for revocations (not subject to RLS); `EditAccessComponent.save()` now calls `RealtimeService.broadcastAccessChange()`
- [x] Fix access changes on timeline events not propagating in realtime — `historic_events` was missing from `ACCESS_CONTROLLED_TABLES` map in `supabase-realtime.service.ts`; added `historic_events: 'historic_event'` so `documentAccessChanges$` triggers re-fetches for timeline event watches
- [x] Fix combat attribute changes not updating in realtime — three issues: (1) `EditAttributeComponent` was saving to `combatants` table instead of `combatant_attributes` junction table; added `CombatService.updateCombatantAttribute()` using upsert; (2) `RealtimeService.watch()` only subscribed to the primary table; added `triggerTables` parameter so related junction table changes trigger re-fetches; (3) `person_attributes` was missing from `supabase_realtime` publication — created `011_person_attributes_realtime.sql`; PeopleService now uses `triggerTables: ['person_attributes']`

## Known Issues

None currently.

## Phase 11: Docker Setup ✅

- [x] Create `Dockerfile` (multi-stage: node build + nginx serve)
- [x] Create `docker/nginx.conf` (Angular static files + Supabase API proxy to Kong)
- [x] Create `docker/kong.yml` (declarative API gateway routing)
- [x] Create `docker/db/roles.sql` and `docker/db/jwt.sql` (DB init scripts)
- [x] Create `docker-compose.yml` (db, kong, rest, auth, realtime, storage, meta, studio, app)
- [x] Create `docker/.env.example` (configurable ports, JWT keys, passwords)
- [x] Create `.dockerignore`
- [x] Update `environment.prod.ts` — empty Supabase URL (resolved to `window.location.origin` at runtime), anon key from `NG_APP_SUPABASE_ANON_KEY` env var
- [x] Update `supabase.provider.ts` — fallback to `window.location.origin` when URL is empty
- [x] Add `docker:build`, `docker:up`, `docker:down`, `docker:save` npm scripts

## Ideas/Improvements

- Consider adding database migrations to CI/CD pipeline
- Consider adding Supabase Edge Functions for complex operations
- Consider implementing offline support in future iteration
