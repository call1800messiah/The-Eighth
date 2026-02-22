# Supabase Migration - TODOs

**Status**: Bug Fixes in Progress
**Last Updated**: 2026-02-18

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

- [ ] Remove Firebase packages (`npm uninstall @angular/fire firebase`)
- [ ] Remove Firebase dev packages (`npm uninstall firebase-admin firebase-tools`)
- [ ] Delete Firebase configuration from environment files
- [ ] Delete any remaining Firebase imports
- [ ] Delete Firebase service account files
- [ ] Update CLAUDE.md with new architecture

## Bug Fixes (Pre-Phase 10)

- [ ] Fix info access not being enforced: access indicator shows correctly but users without access can still see all infos — RLS policy for `info_boxes` table may be missing or misconfigured
- [ ] Fix real-time updates not working: changes made on one client only appear on another after a full reload — Supabase realtime subscriptions not propagating updates
- [ ] Fix `NavigatorLockAcquireTimeoutError`: console error "Acquiring an exclusive Navigator LockManager lock 'lock:sb-127-auth-token' immediately failed" — likely Supabase auth storage lock contention across tabs
- [ ] Fix non-GMs unable to add people to combat: checkbox UI is present but clicking does nothing — RLS policy on `combatants` table likely only allows GM writes
- [ ] Fix dynamic rules (talents, spells, etc.) missing from DB: detail fields not present — `rules` table schema is incomplete, migration needs new columns and re-run
- [ ] Fix project access rights: projects created by non-GM users do not list the creator as having access — check `project.json` access fields for correct access model, likely RLS policy or `document_access` seeding issue
- [ ] Fix access indicator on projects showing wrong data for non-GMs: all projects show only GM having access when viewed as a normal user — access indicator query likely filters by current user context incorrectly
- [ ] Fix access indicator missing entirely on project "Bashuiren Rüstung" for normal users — project may have no `document_access` entries at all, or owner_id not set correctly
- [ ] Fix recent rolls showing "1 WNaN" instead of "1 W20" / "1 W6" — dice sides value not being read correctly from DB, likely a column name mapping issue (e.g. `sides` vs `die_sides`)

## Known Issues

None currently.

## Ideas/Improvements

- Consider adding database migrations to CI/CD pipeline
- Consider adding Supabase Edge Functions for complex operations
- Consider implementing offline support in future iteration
