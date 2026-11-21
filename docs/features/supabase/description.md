# Supabase Migration Specification

## Overview

Migrate TheEighth RPG campaign management app from Firebase (Firestore + Auth + Storage) to locally-run Supabase with PostgreSQL database. Firebase will be **completely removed** from the project.

## Source Locations

| Type | Path |
|------|------|
| Migration Plan | .claude/plans/supabase-migration.md |
| Core Services | src/app/core/services/ |
| Feature Services | src/app/*/services/ |
| Models | src/app/*/models/ |
| Environment | src/environments/ |

## Requirements

### Database Migration
- [ ] Migrate all Firestore collections to PostgreSQL tables
- [ ] Normalize Record<> fields to junction tables
- [ ] Convert subcollections to global tables with polymorphic associations
- [ ] Implement Row Level Security (RLS) policies
- [ ] Preserve all existing data with referential integrity

### Authentication Migration
- [ ] Create Supabase Auth users with manually set passwords
- [ ] Map Firebase UIDs to Supabase UUIDs
- [ ] Maintain backward compatibility with `isGM` property (computed from user_roles)

### Storage Migration
- [ ] Migrate all files from Firebase Storage to Supabase Storage
- [ ] Keep existing path format (`{collection}/{entity-name}.{ext}`)
- [ ] Update StorageService for Supabase Storage API
- [ ] Audio files listed dynamically from Storage bucket

### Service Layer Refactoring
- [ ] Replace AngularFirestore with Supabase client
- [ ] Replace AngularFireAuth with Supabase Auth
- [ ] Replace AngularFireStorage with Supabase Storage
- [ ] Implement real-time subscriptions via Supabase Realtime
- [ ] Remove all Firebase dependencies

## Constraints

- **No downtime strategy**: Small user base allows for coordinated cutover
- **Manual password distribution**: Users receive new credentials out-of-band
- **Single tenant per deployment**: Tenant selected via environment variable
- **Local Supabase for development**: Production deployment TBD

## Bill of Materials

### Existing Code to Modify

| Item | Location | Changes |
|------|----------|---------|
| ApiService | src/app/core/services/api.service.ts | Complete rewrite for Supabase |
| AuthService | src/app/core/services/auth.service.ts | Rewrite for Supabase Auth |
| DataService | src/app/core/services/data.service.ts | Update CRUD, remove access array filters |
| StorageService | src/app/core/services/storage.service.ts | Complete rewrite for Supabase Storage |
| UserService | src/app/core/services/user.service.ts | Add isGM computed property from user_roles |
| PeopleService | src/app/people/services/people.service.ts | Complex joins for junction tables |
| PlaceService | src/app/places/services/place.service.ts | Update queries |
| QuestsService | src/app/quests/services/quests.service.ts | Update queries |
| ProjectService | src/app/projects/services/project.service.ts | Junction table joins |
| AchievementService | src/app/achievements/services/achievement.service.ts | Update queries |
| FlowService | src/app/flow/services/flow.service.ts | flow_items joins |
| RulesService | src/app/rules/services/rules.service.ts | Query from DB instead of JSON |
| CombatService | src/app/combat/services/combat.service.ts | Dynamic combat sessions |
| TimelineService | src/app/overview/services/timeline.service.ts | Pagination pattern change |
| NotesService | src/app/notes/services/notes.service.ts | Update queries |
| InventoryService | src/app/inventory/services/inventory.service.ts | Update queries |
| CampaignService | src/app/overview/services/campaign.service.ts | Update queries |
| CoreModule | src/app/core/core.module.ts | Remove AngularFire, add Supabase provider |
| Environment | src/environments/environment.ts | New Supabase config structure |
| Environment Prod | src/environments/environment.prod.ts | New Supabase config structure |
| AudioPlayerList | src/app/shared/components/audio-player-list/ | List from Storage bucket |

### New Files to Create

| File | Type | Purpose |
|------|------|---------|
| src/app/core/supabase.provider.ts | Provider | Supabase client injection token |
| src/app/core/services/supabase-realtime.service.ts | Service | Reactive wrapper for real-time subscriptions |
| src/types/supabase.ts | Types | Auto-generated TypeScript types from schema |
| supabase/config.toml | Config | Supabase local configuration |
| supabase/migrations/001_initial_schema.sql | Migration | All table definitions |
| supabase/migrations/002_rls_policies.sql | Migration | Row Level Security policies |
| supabase/migrations/003_storage_buckets.sql | Migration | Storage bucket and policies |
| scripts/validate-firebase-data.ts | Script | Pre-migration data validation |
| scripts/firebase-export.ts | Script | Export Firestore to JSON |
| scripts/transform-and-migrate.ts | Script | Transform and load into PostgreSQL |
| scripts/migrate-storage.ts | Script | Migrate files to Supabase Storage |
| scripts/validate-migration.ts | Script | Post-migration validation |

### Dependencies to Add

| Package | Version | Purpose |
|---------|---------|---------|
| @supabase/supabase-js | ^2.x | Supabase JavaScript client |
| supabase | ^1.x (dev) | Supabase CLI for local development |

### Dependencies to Remove (after migration)

| Package | Purpose |
|---------|---------|
| @angular/fire | Firebase Angular bindings |
| firebase | Firebase SDK |
| firebase-admin | Firebase Admin SDK (dev) |
| firebase-tools | Firebase CLI (dev) |

## Architecture Decisions

### 1. Role System
Four roles with hierarchical privileges stored in `user_roles` table:
- **Observer**: Read-only access to shared content
- **Player**: Standard user, owns their characters/content
- **Co-GM**: Similar to GM with some restrictions
- **GM**: Full access, sees everything

### 2. Access Control (Hybrid Three-Layer)
1. **Owner access**: `owner_id = auth.user_id()` (no DB lookup)
2. **Role-based**: `auth.is_gm()` (single user_roles query)
3. **Per-document sharing**: `document_access` table (explicit grants only)

### 3. isGM Backward Compatibility
UserService computes `isGM` from user_roles JOIN to maintain compatibility with 18+ template usages.

### 4. Audio Files
Listed dynamically from Supabase Storage `audio/` folder instead of hardcoded environment config.

## Related Features

| Feature | Relationship |
|---------|--------------|
| flow | Uses flow_items junction table, polymorphic references |
| combat | Dynamic combat_sessions, combatant attributes |
| people | Most complex: 10+ junction tables for skills/advantages/etc. |

## Open Questions

None - all critical decisions documented in migration plan.
