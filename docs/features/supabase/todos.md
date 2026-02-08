# Supabase Migration - TODOs

**Status**: Phase 2 Complete, Phase 3 Ready
**Last Updated**: 2026-02-08

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

## Phase 3: Pre-Migration Validation

- [ ] Create `scripts/validate-firebase-data.ts`
  - [ ] Check orphaned location_id references
  - [ ] Check orphaned parent_id references (places, quests)
  - [ ] Detect circular hierarchies
  - [ ] Check invalid access arrays
  - [ ] Check orphaned flow items
  - [ ] Check combatants referencing deleted people
- [ ] Run validation and fix any issues in Firebase

## Phase 4: Data Export

- [ ] Create `scripts/firebase-export.ts`
  - [ ] Export users collection
  - [ ] Export people collection + subcollections (info)
  - [ ] Export places collection + subcollections (info)
  - [ ] Export quests collection + subcollections (info)
  - [ ] Export projects collection
  - [ ] Export achievements collection
  - [ ] Export inventory collection
  - [ ] Export notes collection
  - [ ] Export rolls collection
  - [ ] Export flows collection
  - [ ] Export rules collection (dynamic)
  - [ ] Export campaign collection
  - [ ] Export timelines + events subcollections
  - [ ] Export combat fighters from hardcoded path
  - [ ] Exclude isPrivate fields
- [ ] Run export script

## Phase 5: Data Transformation & Migration

- [ ] Create `scripts/transform-and-migrate.ts`
  - [ ] Create Firebase ID to PostgreSQL UUID mapping
  - [ ] Seed rules config from JSON files
  - [ ] Seed static rules from JSON files
  - [ ] Migrate users (create in Supabase Auth manually)
  - [ ] Migrate user_roles
  - [ ] Migrate timelines
  - [ ] Migrate core entities (people, places, quests, projects, achievements, inventory, notes, rolls)
  - [ ] Migrate campaign
  - [ ] Migrate flows and flow_items
  - [ ] Second pass: hierarchical FKs (parent_id, location_id, ship_id, timeline_id)
  - [ ] Migrate junction tables (person_advantages, skills, etc.)
  - [ ] Migrate person relationships (bidirectional)
  - [ ] Migrate info_boxes
  - [ ] Migrate historic_events
  - [ ] Migrate combat sessions and combatants
  - [ ] Migrate document_access (explicit grants only, exclude owners/GMs)
- [ ] Run migration script

## Phase 6: Storage Migration

- [ ] Create `scripts/migrate-storage.ts`
  - [ ] Download all files from Firebase Storage
  - [ ] Upload to Supabase Storage (keep same paths)
  - [ ] Verify file counts match
- [ ] Run storage migration

## Phase 7: Post-Migration Validation

- [ ] Create `scripts/validate-migration.ts`
  - [ ] Row count validation
  - [ ] Referential integrity validation
  - [ ] Junction table integrity validation
  - [ ] Access control validation (no owners/GMs in document_access)
  - [ ] Hierarchical data validation (no circular refs)
  - [ ] Combat data validation
  - [ ] Rules migration validation
- [ ] Run validation queries

## Phase 8: Angular Service Refactoring

### Core Infrastructure
- [ ] Create `src/app/core/supabase.provider.ts`
- [ ] Update `src/environments/environment.ts` with Supabase config
- [ ] Update `src/environments/environment.prod.ts` with Supabase config
- [ ] Update CoreModule to use Supabase provider (remove AngularFire)

### Core Services
- [ ] Rewrite `api.service.ts` for Supabase
- [ ] Rewrite `auth.service.ts` for Supabase Auth
- [ ] Rewrite `storage.service.ts` for Supabase Storage
- [ ] Update `data.service.ts` (remove access array filters, use RLS)
- [ ] Update `user.service.ts` (add isGM computed property)
- [ ] Create `supabase-realtime.service.ts` (reactive wrapper)

### Feature Services
- [ ] Update `people.service.ts` (complex junction table joins)
- [ ] Update `place.service.ts`
- [ ] Update `quests.service.ts`
- [ ] Update `project.service.ts` (milestone/requirement joins)
- [ ] Update `achievement.service.ts`
- [ ] Update `flow.service.ts` (flow_items joins)
- [ ] Update `rules.service.ts` (query from DB, not JSON)
- [ ] Update `combat.service.ts` (dynamic sessions)
- [ ] Update `timeline.service.ts` (pagination pattern)
- [ ] Update `notes.service.ts`
- [ ] Update `inventory.service.ts`
- [ ] Update `campaign.service.ts`
- [ ] Update `dice-roller.service.ts`

### Components
- [ ] Update `audio-player-list.component.ts` (list from Storage bucket)

## Phase 9: Testing

- [ ] Test auth flow (login/logout)
- [ ] Test isGM computed property
- [ ] Test RLS policies with each role
- [ ] Test CRUD operations for all entities
- [ ] Test real-time subscriptions
- [ ] Test file upload/download
- [ ] Test audio player
- [ ] Test hierarchical queries (places, quests)
- [ ] Test person with all junction data

## Phase 10: Cleanup

- [ ] Remove Firebase packages (`npm uninstall @angular/fire firebase`)
- [ ] Remove Firebase dev packages (`npm uninstall firebase-admin firebase-tools`)
- [ ] Delete Firebase configuration from environment files
- [ ] Delete any remaining Firebase imports
- [ ] Delete Firebase service account files
- [ ] Update CLAUDE.md with new architecture

## Known Issues

None currently.

## Ideas/Improvements

- Consider adding database migrations to CI/CD pipeline
- Consider adding Supabase Edge Functions for complex operations
- Consider implementing offline support in future iteration
