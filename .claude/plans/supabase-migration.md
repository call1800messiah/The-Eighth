# Firebase to PostgreSQL Migration Plan

## Overview

Migrate TheEighth RPG campaign management app from Firebase (Firestore + Auth + Storage) to locally-run Supabase with PostgreSQL database.

**CRITICAL**: Firebase will be **completely removed** from the project. This is a full migration, not a gradual transition.

### What's Being Migrated

| Component | From | To |
|-----------|------|-----|
| **Database** | Firebase Firestore | Supabase PostgreSQL |
| **Authentication** | Firebase Auth | Supabase Auth |
| **File Storage** | Firebase Storage | Supabase Storage |
| **Real-time** | Firestore snapshots | Supabase Realtime (PostgreSQL CDC) |

### Key Improvements

- **Role-based access control**: Player, Observer, Co-GM, GM roles (replacing simple isGM flag)
- **Hybrid permissions**: Role-based + per-document sharing via RLS policies
- **Normalized schema**: Junction tables replacing Firebase Record<id, data> patterns
- **Global tables**: Subcollections converted to global tables with foreign keys
- **Storage organization**: Structured folder hierarchy with owner-based access control

## Architecture Decisions

### 1. Role System
Four roles with hierarchical privileges:
- **Observer**: Read-only access to shared content
- **Player**: Standard user, owns their characters/content
- **Co-GM**: Similar to GM with some restrictions
- **GM**: Full access, sees everything

Stored in separate `user_roles` table for flexibility (users can have multiple roles).

### 2. Access Control Strategy
**Hybrid three-layer system**:
1. **Owner access**: Creators always have full access (`owner_id = auth.user_id()`)
2. **Role-based**: GMs see everything (`auth.is_gm()`)
3. **Per-document sharing**: Explicit grants via `document_access` table

### 3. Schema Normalization
**From Firebase** → **To PostgreSQL**:
- `PersonDB.advantages: Record<ruleId, {level, details}>` → `person_advantages` junction table
- `ProjectDB.mDesc/mReq: Record<id, value>` → `project_milestones` table
- `people/{id}/info` subcollection → `info_boxes` global table with `entity_type/entity_id` polymorphic association

### 4. Legacy Fields (DO NOT MIGRATE)

**`isPrivate` field** - Deprecated in favor of `access` arrays and document_access table:
- ❌ `PlaceDB.isPrivate` - DO NOT MIGRATE (replaced by access control system)
- ❌ `InventoryItem.isPrivate` - DO NOT MIGRATE (replaced by access control system)
- ❌ `Roll.isPrivate` - DO NOT MIGRATE (replaced by access control system)
- ❌ `CampaignData.isPrivate` - DO NOT MIGRATE (replaced by access control system)

**Why removed**: The `isPrivate` boolean was a simple visibility flag. The new system uses:
- `owner_id` column (creator always has access)
- `document_access` table (explicit per-user grants)
- RLS policies (role-based access via `auth.is_gm()`)

This provides much finer-grained control than a binary private/public flag.

## Database Schema

### Core System Tables

```sql
-- User roles
CREATE TYPE user_role AS ENUM ('observer', 'player', 'co_gm', 'gm');

CREATE TABLE users (
  id UUID PRIMARY KEY,
  firebase_uid TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  view_ancestry BOOLEAN DEFAULT false,
  view_banner BOOLEAN DEFAULT false,
  view_location BOOLEAN DEFAULT false,
  view_name BOOLEAN DEFAULT false,
  view_title BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE user_roles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'player',
  UNIQUE(user_id, role)
);

-- Access control (replaces Firebase 'access' array)
CREATE TABLE document_access (
  id UUID PRIMARY KEY,
  entity_type TEXT NOT NULL, -- 'person', 'place', 'quest', etc.
  entity_id UUID NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(entity_type, entity_id, user_id)
);

-- Rules configuration tables (seeded from assets/{tenant}/rules.json)
-- These are tenant-level config, not user-editable

-- Allowed attributes for person stats (from rules.json.allowedAttributes)
CREATE TABLE allowed_attributes (
  id UUID PRIMARY KEY,
  tenant TEXT NOT NULL, -- 'tde5', 'the-eighth', etc.
  name TEXT NOT NULL,
  short_code TEXT NOT NULL,
  display_style TEXT NOT NULL, -- 'number' or 'bar'
  sort_order INTEGER NOT NULL,
  roll_type TEXT, -- 'attribute' or NULL
  UNIQUE(tenant, short_code)
);

-- Hit locations for combat (from rules.json.hitLocations)
CREATE TABLE hit_locations (
  id UUID PRIMARY KEY,
  tenant TEXT NOT NULL,
  roll_value INTEGER NOT NULL, -- 1-20 on d20
  location_name TEXT NOT NULL,
  UNIQUE(tenant, roll_value)
);

-- Combat states/conditions (from rules.json.states)
CREATE TABLE combat_states (
  id UUID PRIMARY KEY,
  tenant TEXT NOT NULL,
  name TEXT NOT NULL,
  UNIQUE(tenant, name)
);

-- Rules config metadata (from rules.json top-level fields)
CREATE TABLE rules_config (
  id UUID PRIMARY KEY,
  tenant TEXT NOT NULL UNIQUE,
  edition INTEGER NOT NULL,
  addable_rule_types JSONB NOT NULL -- Schema for custom rule fields
);
```

### Entity Tables

**Main entities**: people, places, quests, projects, achievements, inventory, notes, rolls
**All have**: `id UUID`, `owner_id UUID REFERENCES users(id)`, timestamps

**Key patterns**:
- **Hierarchical**: places.parent_id, quests.parent_id (self-referencing FKs)
- **Polymorphic**: info_boxes links to any entity via entity_type + entity_id
- **Junction tables**: person_advantages, person_skills, person_spells, etc. (7+ tables)

### Example: People Table + Junction Tables

```sql
CREATE TABLE people (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  title TEXT,
  image TEXT, -- Storage path
  banner TEXT, -- Storage path
  pc BOOLEAN DEFAULT false,
  culture TEXT,
  profession TEXT,
  race TEXT,
  birthday TEXT,
  birthyear INTEGER,
  deathday TEXT,
  height INTEGER,
  location_id UUID REFERENCES places(id), -- FK to places (replaces location string)
  xp INTEGER DEFAULT 0,
  owner_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Replaces PersonDB.advantages Record<ruleId, {level, details}>
CREATE TABLE person_advantages (
  id UUID PRIMARY KEY,
  person_id UUID REFERENCES people(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES rules(id) ON DELETE CASCADE,
  level TEXT,
  details TEXT,
  UNIQUE(person_id, rule_id)
);

-- Replaces PersonDB.disadvantages Record<ruleId, {level, details}>
CREATE TABLE person_disadvantages (
  id UUID PRIMARY KEY,
  person_id UUID REFERENCES people(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES rules(id) ON DELETE CASCADE,
  level TEXT,
  details TEXT,
  UNIQUE(person_id, rule_id)
);

-- Replaces PersonDB.feats Record<ruleId, {level, details}>
CREATE TABLE person_feats (
  id UUID PRIMARY KEY,
  person_id UUID REFERENCES people(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES rules(id) ON DELETE CASCADE,
  level TEXT,
  details TEXT,
  UNIQUE(person_id, rule_id)
);

-- Replaces PersonDB.skills Record<ruleId, number>
CREATE TABLE person_skills (
  id UUID PRIMARY KEY,
  person_id UUID REFERENCES people(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES rules(id) ON DELETE CASCADE,
  value INTEGER NOT NULL,
  UNIQUE(person_id, rule_id)
);

-- Replaces PersonDB.spells Record<ruleId, number>
CREATE TABLE person_spells (
  id UUID PRIMARY KEY,
  person_id UUID REFERENCES people(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES rules(id) ON DELETE CASCADE,
  value INTEGER NOT NULL,
  UNIQUE(person_id, rule_id)
);

-- Replaces PersonDB.cantrips Record<ruleId, number>
CREATE TABLE person_cantrips (
  id UUID PRIMARY KEY,
  person_id UUID REFERENCES people(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES rules(id) ON DELETE CASCADE,
  value INTEGER NOT NULL,
  UNIQUE(person_id, rule_id)
);

-- Replaces PersonDB.liturgys Record<ruleId, number>
CREATE TABLE person_liturgies (
  id UUID PRIMARY KEY,
  person_id UUID REFERENCES people(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES rules(id) ON DELETE CASCADE,
  value INTEGER NOT NULL,
  UNIQUE(person_id, rule_id)
);

-- Replaces PersonDB.attributes array
CREATE TABLE person_attributes (
  id UUID PRIMARY KEY,
  person_id UUID REFERENCES people(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'lep', 'asp', etc.
  current INTEGER NOT NULL,
  max INTEGER NOT NULL,
  UNIQUE(person_id, type)
);

-- Replaces PersonDB.tags array
CREATE TABLE person_tags (
  id UUID PRIMARY KEY,
  person_id UUID REFERENCES people(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  UNIQUE(person_id, tag)
);

-- Replaces PersonDB.parents, children, siblings, partners, relatives
-- Note: relatives is Record<string, string[]> like {"uncle": ["id1", "id2"]}
CREATE TABLE person_relationships (
  id UUID PRIMARY KEY,
  person_id UUID REFERENCES people(id) ON DELETE CASCADE,
  related_person_id UUID REFERENCES people(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL, -- 'parent', 'child', 'sibling', 'partner', 'uncle', 'cousin', etc.
  UNIQUE(person_id, related_person_id, relationship_type),
  CHECK (person_id != related_person_id)
);
```

### Example: Projects Normalization

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  benefit TEXT,
  interval TEXT,
  owner_id UUID REFERENCES users(id)
);

-- Replaces ProjectDB.mDesc/mReq parallel Records
CREATE TABLE project_milestones (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  description TEXT,
  required_points INTEGER NOT NULL,
  sort_order INTEGER
);

-- Replaces ProjectDB.rCur/rReq/rSkill/rThresh parallel Records
CREATE TABLE project_requirements (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  skill TEXT NOT NULL,
  current_points INTEGER DEFAULT 0,
  required_points INTEGER NOT NULL,
  threshold INTEGER NOT NULL,
  sort_order INTEGER
);
```

### Complete Schema: All Entity Tables

```sql
-- Places (hierarchical with parent_id)
-- Note: isPrivate is LEGACY - DO NOT MIGRATE
CREATE TABLE places (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'city', 'building', 'region', etc.
  image TEXT, -- Storage path
  inhabitants TEXT, -- Description of inhabitants
  parent_id UUID REFERENCES places(id), -- Self-referencing for hierarchy
  owner_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quests (hierarchical with parent_id)
CREATE TABLE quests (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- Quest type enum
  description TEXT,
  completed BOOLEAN DEFAULT false,
  parent_id UUID REFERENCES quests(id), -- Self-referencing for hierarchy
  owner_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Achievements
CREATE TABLE achievements (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- Storage path
  unlocked TIMESTAMP WITH TIME ZONE NOT NULL,
  owner_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Achievement to People junction (many-to-many)
CREATE TABLE achievement_people (
  id UUID PRIMARY KEY,
  achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
  person_id UUID REFERENCES people(id) ON DELETE CASCADE,
  UNIQUE(achievement_id, person_id)
);

-- Inventory
-- Note: isPrivate is LEGACY - DO NOT MIGRATE
CREATE TABLE inventory (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  character TEXT, -- Person name (not FK, just string)
  owner_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notes
CREATE TABLE notes (
  id UUID PRIMARY KEY,
  title TEXT,
  content TEXT,
  category TEXT,
  owner_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  modified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rolls (dice roll history)
-- Note: isPrivate is LEGACY - DO NOT MIGRATE
CREATE TYPE roll_type AS ENUM ('attribute', 'skill', 'skill5', 'damage', 'dice');

CREATE TABLE rolls (
  id UUID PRIMARY KEY,
  type roll_type NOT NULL,
  owner_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Common fields
  modifier INTEGER,
  name TEXT, -- Skill/attribute name

  -- AttributeRoll fields
  attribute INTEGER, -- Single attribute value
  roll INTEGER, -- Single D20 result

  -- SkillRoll fields
  attributes INTEGER[], -- Array of 3 attributes [COU, INT, CHA]
  rolls INTEGER[], -- Array of 3 D20 results
  skill_points INTEGER,

  -- DamageRoll/DiceRoll fields
  dice_rolls INTEGER[], -- Array of dice results
  dice_type TEXT -- 'd6', 'd20', etc.
);

-- Flows (NEW FEATURE - ordered reference lists)
CREATE TABLE flows (
  id UUID PRIMARY KEY,
  title TEXT,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  owner_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Flow items (polymorphic references to people/places/quests/notes)
CREATE TYPE flow_item_type AS ENUM ('person', 'place', 'quest', 'note');

CREATE TABLE flow_items (
  id UUID PRIMARY KEY,
  flow_id UUID REFERENCES flows(id) ON DELETE CASCADE,
  type flow_item_type NOT NULL,
  entity_id UUID NOT NULL, -- Reference to people/places/quests/notes
  sort_order INTEGER NOT NULL,
  UNIQUE(flow_id, sort_order)
);

-- Campaign (singleton table)
-- Note: isPrivate is LEGACY - DO NOT MIGRATE (was replaced by document_access)
CREATE TABLE campaign (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  captain TEXT,
  crewcount INTEGER,
  date TEXT,
  ship TEXT, -- Legacy ship name (kept for backward compatibility)
  ship_id UUID REFERENCES places(id), -- FK to places (preferred - links to actual place)
  stamina_reduction INTEGER,
  timeline_id UUID REFERENCES timelines(id), -- FK to timelines
  xp INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Timelines
CREATE TABLE timelines (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Historic events (replaces timelines/{id}/events subcollection)
CREATE TABLE historic_events (
  id UUID PRIMARY KEY,
  timeline_id UUID REFERENCES timelines(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  date TEXT, -- Event date as string
  type TEXT, -- Event type
  owner_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  modified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Subcollections → Global Tables

```sql
-- Info boxes (replaces people/{id}/info, places/{id}/info, quests/{id}/info)
CREATE TYPE info_type AS ENUM ('appearance', 'background', 'note', 'character', 'goals', 'reward');

CREATE TABLE info_boxes (
  id UUID PRIMARY KEY,
  type info_type NOT NULL,
  content TEXT NOT NULL,
  entity_type TEXT NOT NULL, -- 'person', 'place', 'quest'
  entity_id UUID NOT NULL,
  owner_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  modified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Row Level Security (RLS)

### Helper Functions

```sql
CREATE OR REPLACE FUNCTION auth.user_id() RETURNS UUID AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION auth.is_gm() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.user_id() AND role = 'gm'
  );
$$ LANGUAGE SQL STABLE;

-- Note: Removed auth.has_document_access() function
-- Reason: Function calls on every row are slow. Use inline EXISTS in policies instead.
```

### Standard RLS Policy Pattern

Applied to all entity tables (people, places, quests, etc.):

```sql
-- Enable RLS
ALTER TABLE people ENABLE ROW LEVEL SECURITY;

-- SELECT: Owner, GM, or explicit access
-- OPTIMIZED: Inline EXISTS instead of function call
CREATE POLICY people_select_policy ON people
  FOR SELECT
  USING (
    owner_id = auth.user_id() OR
    auth.is_gm() OR
    EXISTS (
      SELECT 1 FROM document_access
      WHERE entity_type = 'person'
      AND entity_id = people.id
      AND user_id = auth.user_id()
    )
  );

-- INSERT: Anyone can create, owner is current user
CREATE POLICY people_insert_policy ON people
  FOR INSERT
  WITH CHECK (owner_id = auth.user_id());

-- UPDATE/DELETE: Only owner or GM
CREATE POLICY people_update_policy ON people
  FOR UPDATE
  USING (owner_id = auth.user_id() OR auth.is_gm())
  WITH CHECK (owner_id = auth.user_id() OR auth.is_gm());

CREATE POLICY people_delete_policy ON people
  FOR DELETE
  USING (owner_id = auth.user_id() OR auth.is_gm());
```

### Access Control Philosophy

**IMPORTANT: No automatic grants needed in document_access table**

The `document_access` table should ONLY contain **explicit per-document shares**, NOT automatic grants for owners or GMs.

#### Why No Automatic Grants?

The RLS policy already handles owner and GM access:

```sql
CREATE POLICY people_select_policy ON people
  FOR SELECT
  USING (
    owner_id = auth.user_id() OR    -- ✅ Owner access (no DB lookup)
    auth.is_gm() OR                  -- ✅ GM access (single user_roles query)
    EXISTS (                         -- ⚠️ Explicit grants (document_access lookup)
      SELECT 1 FROM document_access
      WHERE entity_type = 'person'
      AND entity_id = people.id
      AND user_id = auth.user_id()
    )
  );
```

**Policy evaluation order** (short-circuits on first TRUE):
1. Check `owner_id` - instant (column comparison)
2. Check `auth.is_gm()` - fast (single indexed query)
3. Check `document_access` - slowest (subquery with joins)

#### Performance Comparison

| Approach | document_access rows | Query cost | Maintenance |
|----------|---------------------|------------|-------------|
| **Trigger (old)** | 11 per document (10 GMs + owner) | HIGH - 11,000 rows for 1k docs | Trigger runs on every INSERT |
| **Backend only (new)** | ~0.1 per document (only explicit shares) | LOW - 100 rows for 1k docs | Simple application code |

#### What Goes in document_access?

**✅ Store these**:
- Player A shares their character with Player B
- GM shares secret quest with specific co-GM
- Player grants view access to Observer role user

**❌ Don't store these**:
- Owner access (redundant with `owner_id` column)
- GM access (redundant with `auth.is_gm()` check)

#### Backend Implementation

```typescript
// data.service.ts - SIMPLIFIED
store(item: any, collection: string, id?: string): Promise<{ success: boolean; id?: string }> {
  const storeItem = { ...item };

  if (!id) {
    // NEW documents: Just set owner_id, NO document_access insert needed
    storeItem.owner_id = this.user.id;
    // RLS policy handles owner + GM access automatically
  } else {
    // Updates: Never overwrite owner_id
    delete storeItem.owner_id;
  }

  // ... rest of store logic
}

// NEW: Explicit share function (called when user clicks "Share with...")
async shareDocument(
  entityType: string,
  entityId: string,
  userId: string
): Promise<void> {
  // Only NOW do we insert into document_access
  await supabase
    .from('document_access')
    .insert({
      entity_type: entityType,
      entity_id: entityId,
      user_id: userId
    });
}
```

#### Migration Changes

When migrating Firebase `access` arrays to `document_access`:

```typescript
// During migration: Filter out owner and GMs
for (const userId of person.access) {
  const user = users.find(u => u.id === userId);

  // SKIP owner and GMs - RLS handles them
  if (userId === person.owner || user?.isGM) {
    continue;
  }

  // ONLY insert explicit grants
  await client.query(`
    INSERT INTO document_access (entity_type, entity_id, user_id)
    VALUES ('person', $1, $2)
  `, [pgPersonId, idMap.get(userId)]);
}
```

#### Result

- ✅ **10-100x smaller** document_access table
- ✅ **Faster queries** - RLS checks owner/GM before hitting document_access
- ✅ **No trigger overhead** - database doesn't run code on every INSERT
- ✅ **Clearer semantics** - document_access means "explicit share", not "default access"
- ✅ **Same for all tables** - pattern applies universally (people, places, quests, flows, etc.)

## Indexing Strategy

### Critical Indexes for Performance

```sql
-- User roles lookup (used in auth.is_gm())
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role);

-- Document access (used in RLS policies)
CREATE INDEX idx_document_access_lookup ON document_access(entity_type, entity_id, user_id);
CREATE INDEX idx_document_access_user ON document_access(user_id);

-- Rules config tables (tenant-scoped lookups)
CREATE INDEX idx_allowed_attributes_tenant ON allowed_attributes(tenant);
CREATE INDEX idx_hit_locations_tenant ON hit_locations(tenant);
CREATE INDEX idx_combat_states_tenant ON combat_states(tenant);

-- People queries
CREATE INDEX idx_people_owner ON people(owner_id);
CREATE INDEX idx_people_location ON people(location_id);
CREATE INDEX idx_people_pc ON people(pc) WHERE pc = true; -- Partial index for player characters

-- Places hierarchy
CREATE INDEX idx_places_owner ON places(owner_id);
CREATE INDEX idx_places_parent ON places(parent_id);

-- Quests hierarchy
CREATE INDEX idx_quests_owner ON quests(owner_id);
CREATE INDEX idx_quests_parent ON quests(parent_id);
CREATE INDEX idx_quests_completed ON quests(completed);

-- Projects
CREATE INDEX idx_projects_owner ON projects(owner_id);

-- Achievements
CREATE INDEX idx_achievements_owner ON achievements(owner_id);
CREATE INDEX idx_achievements_unlocked ON achievements(unlocked DESC); -- For recent achievements

-- Inventory
CREATE INDEX idx_inventory_owner ON inventory(owner_id);

-- Notes
CREATE INDEX idx_notes_owner ON notes(owner_id);
-- Note: notes.tags was removed - notes don't have tags in this application

-- Rolls
CREATE INDEX idx_rolls_owner ON rolls(owner_id);
CREATE INDEX idx_rolls_created ON rolls(created DESC); -- For recent rolls
CREATE INDEX idx_rolls_type ON rolls(type);

-- Flows
CREATE INDEX idx_flows_owner ON flows(owner_id);
CREATE INDEX idx_flows_date ON flows(date DESC);

-- Flow items
CREATE INDEX idx_flow_items_flow ON flow_items(flow_id);
CREATE INDEX idx_flow_items_entity ON flow_items(entity_id, type);
CREATE INDEX idx_flow_items_order ON flow_items(flow_id, sort_order);

-- Timelines
CREATE INDEX idx_timelines_name ON timelines(name);
CREATE INDEX idx_timelines_owner ON timelines(owner_id);

-- Historic events
CREATE INDEX idx_historic_events_timeline ON historic_events(timeline_id);
CREATE INDEX idx_historic_events_created ON historic_events(created_at DESC);

-- Info boxes (polymorphic)
CREATE INDEX idx_info_boxes_entity ON info_boxes(entity_type, entity_id);
CREATE INDEX idx_info_boxes_owner ON info_boxes(owner_id);

-- Junction tables (person_*)
CREATE INDEX idx_person_advantages_person ON person_advantages(person_id);
CREATE INDEX idx_person_disadvantages_person ON person_disadvantages(person_id);
CREATE INDEX idx_person_feats_person ON person_feats(person_id);
CREATE INDEX idx_person_skills_person ON person_skills(person_id);
CREATE INDEX idx_person_spells_person ON person_spells(person_id);
CREATE INDEX idx_person_cantrips_person ON person_cantrips(person_id);
CREATE INDEX idx_person_liturgies_person ON person_liturgies(person_id);
CREATE INDEX idx_person_attributes_person ON person_attributes(person_id);
CREATE INDEX idx_person_tags_person ON person_tags(person_id);
CREATE INDEX idx_person_relationships_person ON person_relationships(person_id);
CREATE INDEX idx_person_relationships_related ON person_relationships(related_person_id);

-- Project junction tables
CREATE INDEX idx_project_milestones_project ON project_milestones(project_id);
CREATE INDEX idx_project_requirements_project ON project_requirements(project_id);

-- Achievement junction
CREATE INDEX idx_achievement_people_achievement ON achievement_people(achievement_id);
CREATE INDEX idx_achievement_people_person ON achievement_people(person_id);

-- Combat
CREATE INDEX idx_combatants_session ON combatants(combat_session_id);
CREATE INDEX idx_combatants_person ON combatants(person_id);
CREATE INDEX idx_combatants_initiative ON combatants(combat_session_id, initiative DESC);
CREATE INDEX idx_combatant_attributes_combatant ON combatant_attributes(combatant_id);
CREATE INDEX idx_combatant_states_combatant ON combatant_states(combatant_id);

-- Rules
CREATE INDEX idx_rules_category ON rules(category);
CREATE INDEX idx_rules_name ON rules(name);
CREATE INDEX idx_rules_static ON rules(is_static) WHERE is_static = true; -- Partial index for static rules
CREATE INDEX idx_rules_custom ON rules(is_custom) WHERE is_custom = true; -- Partial index for custom rules
```

### Index Maintenance Notes

- **GIN indexes** on arrays (tags, attributes) support array operations like `@>` (contains)
- **Partial indexes** reduce size for boolean filters (e.g., `WHERE pc = true`)
- **Composite indexes** for common queries (entity_type + entity_id)
- **DESC indexes** for recent items sorting

## Migration Process

### Phase 1: Export from Firebase

Script: `scripts/firebase-export.ts`

Export all collections to JSON:
- users, people, places, quests, projects, achievements, inventory, notes, flows, rolls, rules, campaign, timelines
- Subcollections: people/{id}/info, places/{id}/info, quests/{id}/info, timelines/{id}/events
- Combat data from hardcoded path: combat/tKthlBKLy0JuVaPnXWzY/fighters

**IMPORTANT: Exclude legacy isPrivate fields during export:**
- PlaceDB.isPrivate - DO NOT EXPORT
- InventoryItem.isPrivate - DO NOT EXPORT
- Roll.isPrivate - DO NOT EXPORT

### Phase 2: Schema Creation

Script: `supabase/migrations/001_initial_schema.sql`

Create all tables in dependency order:
1. users, user_roles, rules_config
2. allowed_attributes, hit_locations, combat_states, rules
3. people, places, quests, projects, achievements, inventory, notes, rolls
4. Junction tables (person_advantages, person_skills, etc.)
5. info_boxes, historic_events
6. combat_sessions, combatants
7. document_access

### Phase 3: Data Transformation & Migration

Script: `scripts/transform-and-migrate.ts`

**Key transformations**:

1. **Firebase UID → PostgreSQL UUID mapping**:
   - Create `idMap: Map<firebaseId, postgresUUID>`
   - Used for all foreign key references

2. **Timestamp conversion**:
   ```typescript
   function convertTimestamp(fbTimestamp: {seconds: number}): Date {
     return new Date(fbTimestamp.seconds * 1000);
   }
   ```

3. **Record<id, data> → Junction tables**:
   ```typescript
   // Firebase: person.advantages = {ruleId1: {level: "2", details: "..."}, ...}
   // PostgreSQL:
   for (const [ruleId, data] of Object.entries(person.advantages)) {
     await client.query(`
       INSERT INTO person_advantages (person_id, rule_id, level, details)
       VALUES ($1, $2, $3, $4)
     `, [pgPersonId, idMap.get(ruleId), data.level, data.details]);
   }

   // NOTE: Firebase has typo 'liturgys' but PostgreSQL table is 'person_liturgies'
   // Migration script must read person.liturgys and write to person_liturgies
   ```

4. **Subcollections → Global tables**:
   ```typescript
   // Firebase: people/{personId}/info/{infoId}
   // PostgreSQL:
   await client.query(`
     INSERT INTO info_boxes (entity_type, entity_id, type, content, owner_id)
     VALUES ('person', $1, $2, $3, $4)
   `, [pgPersonId, info.type, info.content, pgOwnerId]);
   ```

5. **Access arrays → document_access table** (ONLY explicit grants):
   ```typescript
   // IMPORTANT: Filter out owner and GMs - they're handled by RLS policies
   for (const userId of person.access) {
     const user = users.find(u => u.firebaseId === userId);

     // SKIP: Owner (handled by owner_id column)
     if (userId === person.owner) {
       continue;
     }

     // SKIP: GMs (handled by auth.is_gm() in RLS)
     if (user?.isGM) {
       continue;
     }

     // ONLY insert explicit grants (non-owner, non-GM users)
     await client.query(`
       INSERT INTO document_access (entity_type, entity_id, user_id)
       VALUES ('person', $1, $2)
       ON CONFLICT DO NOTHING
     `, [pgPersonId, idMap.get(userId)]);
   }
   ```

6. **Flows (NEW FEATURE) → flows + flow_items tables**:
   ```typescript
   // Firebase: FlowDB { access, date, items: FlowItemDB[], owner, title }
   // PostgreSQL: Split into flows + flow_items

   const flowResult = await client.query(`
     INSERT INTO flows (id, title, date, owner_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id
   `, [pgFlowId, flow.title, new Date(flow.date.seconds * 1000), idMap.get(flow.owner)]);

   // Insert flow items with order
   for (const item of flow.items) {
     const entityId = idMap.get(
       item.type === 'quest' ? item.questId :
       item.type === 'person' ? item.personId :
       item.type === 'place' ? item.placeId :
       item.noteId
     );

     await client.query(`
       INSERT INTO flow_items (flow_id, type, entity_id, sort_order)
       VALUES ($1, $2, $3, $4)
     `, [pgFlowId, item.type, entityId, item.order]);
   }

   // Insert access records (ONLY explicit grants)
   for (const userId of flow.access) {
     const user = users.find(u => u.firebaseId === userId);

     // SKIP: Owner and GMs (handled by RLS policies)
     if (userId === flow.owner || user?.isGM) {
       continue;
     }

     // ONLY insert explicit grants
     await client.query(`
       INSERT INTO document_access (entity_type, entity_id, user_id)
       VALUES ('flow', $1, $2)
       ON CONFLICT DO NOTHING
     `, [pgFlowId, idMap.get(userId)]);
   }
   ```

### Phase 4: Storage Migration

Script: `scripts/migrate-storage.ts`

**CRITICAL**: Firebase Storage will be completely removed. All files must be migrated to Supabase Storage.

**Steps**:

1. **Create Supabase Storage bucket**:
   ```sql
   INSERT INTO storage.buckets (id, name, public)
   VALUES ('the-eighth', 'the-eighth', true);
   ```

2. **Apply storage RLS policies** (see "Storage Migration" section above)

3. **Download all files from Firebase Storage**:
   ```typescript
   const [files] = await firebaseBucket.getFiles();
   // Total files: ~XXX (check Firebase console)
   ```

4. **Upload to Supabase Storage (paths unchanged)**:
   - `people/balan-cantara.jpg` → `people/balan-cantara.jpg` (unchanged)
   - `places/havena.jpg` → `places/havena.jpg` (unchanged)
   - `achievements/first-quest.png` → `achievements/first-quest.png` (unchanged)
   - `audio/santana.mp3` → `audio/santana.mp3` (unchanged)

   **Note**: Paths use entity names (slugs), not IDs. No transformation needed.

5. **Update database paths** - NOT NEEDED (paths staying the same format)

6. **Validation**:
   ```typescript
   // Verify file counts match
   const supabaseFiles = await supabase.storage.from('the-eighth').list();
   console.log(`Migrated ${supabaseFiles.length} files`);

   // Verify database paths are correct (no updates needed since format unchanged)
   const { data: people } = await supabase
     .from('people')
     .select('id, image, banner')
     .or('image.is.not.null,banner.is.not.null');

   console.log(`People with image/banner paths: ${people.length}`);
   ```

### Phase 5: Data Validation

Run validation queries:
- Compare row counts with Firebase export
- Verify foreign key constraints
- Test RLS policies with sample users
- Test hierarchical queries (places, quests)
- Verify junction table data integrity
- **Verify storage files migrated** (file counts match, paths unchanged)
- **Verify audio files migrated** (check audio/ folder, test AudioPlayerListComponent)
- **Test storage RLS policies** (upload/update/delete with correct ownership checks)

## Critical Implementation Details

### 1. Combat System Migration

Firebase has hardcoded path: `combat/tKthlBKLy0JuVaPnXWzY/fighters`

**PostgreSQL solution**:
```sql
-- Create combat sessions table
CREATE TABLE combat_sessions (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true
);

-- Migrate hardcoded session
-- NOTE: Firebase ID 'tKthlBKLy0JuVaPnXWzY' is NOT a valid UUID
-- Generate a new UUID and maintain a mapping for migration
INSERT INTO combat_sessions (id, name, is_active)
VALUES (gen_random_uuid(), 'Main Combat', true);
-- Migration script must map old Firebase ID to new PostgreSQL UUID

-- Create dynamic combatants table
CREATE TABLE combatants (
  id UUID PRIMARY KEY,
  combat_session_id UUID REFERENCES combat_sessions(id),
  person_id UUID REFERENCES people(id), -- NULL for generic enemies
  name TEXT, -- For non-person combatants (NULL if person_id set)
  initiative INTEGER,
  active BOOLEAN,
  CHECK ((person_id IS NULL AND name IS NOT NULL) OR (person_id IS NOT NULL AND name IS NULL))
);

-- Combat attributes (stored for enemies only, people reference person_attributes)
CREATE TABLE combatant_attributes (
  id UUID PRIMARY KEY,
  combatant_id UUID REFERENCES combatants(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'lep', 'asp', etc.
  current INTEGER NOT NULL,
  max INTEGER NOT NULL,
  UNIQUE(combatant_id, type)
);

-- Combat states (status effects like "prone", "bleeding")
CREATE TABLE combatant_states (
  id UUID PRIMARY KEY,
  combatant_id UUID REFERENCES combatants(id) ON DELETE CASCADE,
  state TEXT NOT NULL -- References combat_states.name
);
```

**Migration strategy**:
- **Person combatants**: Migrate `{ person: personId, active, initiative }` → Don't migrate attributes (read from `person_attributes` via JOIN)
- **Enemy combatants**: Migrate `{ name: "Orc", active, initiative, attributes: [...] }` → Store attributes in `combatant_attributes` table

### 2. Hierarchical Data (Places, Quests)

Use recursive CTEs for hierarchy queries:

```sql
-- Get all ancestors of a place
WITH RECURSIVE ancestors AS (
  SELECT id, name, parent_id, 0 AS depth
  FROM places WHERE id = $1
  UNION ALL
  SELECT p.id, p.name, p.parent_id, a.depth + 1
  FROM places p
  JOIN ancestors a ON p.id = a.parent_id
)
SELECT * FROM ancestors ORDER BY depth DESC;
```

### 3. Rules System Migration

**Firebase structure** (dual-source):
1. **Static rules**: `assets/{tenant}/rules.json` (loaded via HTTP) - Core game rules (advantages, disadvantages, feats, skills, spells, cantrips, liturgies)
2. **Dynamic rules**: Firestore `rules` collection (user-created custom rules)

**PostgreSQL**: Flatten into `rules` table with category enum:
```sql
CREATE TYPE rule_category AS ENUM (
  'advantage', 'disadvantage', 'feat', 'skill',
  'spell', 'cantrip', 'liturgy'
);

CREATE TABLE rules (
  id UUID PRIMARY KEY,
  category rule_category NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_static BOOLEAN DEFAULT false, -- TRUE for seeded rules from JSON
  is_custom BOOLEAN DEFAULT false, -- TRUE for user-created rules
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Migration steps**:

1. **Seed static rules from JSON**:
   ```typescript
   const rulesJson = JSON.parse(fs.readFileSync(`assets/${tenant}/rules.json`));

   for (const [category, rulesMap] of Object.entries(rulesJson.rules)) {
     for (const [ruleId, rule] of Object.entries(rulesMap)) {
       await client.query(`
         INSERT INTO rules (id, category, name, description, is_static)
         VALUES ($1, $2, $3, $4, true)
       `, [ruleId, category, rule.name, rule.description]);
     }
   }
   ```

2. **Migrate Firestore custom rules**:
   ```typescript
   for (const rule of firestoreRules) {
     await client.query(`
       INSERT INTO rules (id, category, name, description, is_custom)
       VALUES ($1, $2, $3, $4, true)
     `, [idMap.get(rule.id), rule.category, rule.name, rule.description]);
   }
   ```

3. **Update RulesService**: Remove JSON HTTP loading, query Supabase instead:
   ```typescript
   // OLD: getRulesConfig() loads assets/{tenant}/rules.json via HTTP
   // NEW: Query all rules from database
   getRulesConfig(): Promise<Rules> {
     return supabase
       .from('rules')
       .select('*')
       .then(({ data }) => this.transformToRulesConfig(data));
   }
   ```

### 4. Person Relationships

Bidirectional relationships (parents/children, partners, siblings):

```sql
CREATE TYPE relationship_type AS ENUM ('parent', 'child', 'partner', 'sibling', 'relative');

CREATE TABLE person_relationships (
  id UUID PRIMARY KEY,
  person_id UUID REFERENCES people(id) ON DELETE CASCADE,
  related_person_id UUID REFERENCES people(id) ON DELETE CASCADE,
  relationship_type relationship_type NOT NULL,
  UNIQUE(person_id, related_person_id, relationship_type),
  CHECK (person_id != related_person_id)
);
```

**Important**: Insert both directions if needed (e.g., A is parent of B, B is child of A).

### 5. Storage Migration (Firebase Storage → Supabase Storage)

**Firebase will be completely removed from the project.** All files must be migrated to Supabase Storage.

#### Current Storage Fields

Image/file paths stored as strings in these fields:
- `people.image` - Person avatar
- `people.banner` - Person banner image
- `places.image` - Place image
- `achievements.icon` - Achievement icon
- `audio/*` - Audio files (listed dynamically from Supabase Storage, not from config)

#### Supabase Storage Structure

**Bucket organization**:
```
the-eighth (bucket)
├── people/           # people.image and people.banner
│   ├── balan-cantara.jpg       # Person avatar
│   └── thorwal-banner.jpg      # Person banner
├── places/           # places.image
│   └── havena.jpg
├── achievements/     # achievements.icon
│   └── first-quest.png
└── audio/            # Tenant-level shared audio files
    └── santana.mp3   # Public read, GM write
```

**Note**: Paths use entity names (slugs), not IDs. Format: `{collection}/{entity-name}.{ext}`

#### Storage Bucket Configuration

```sql
-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('the-eighth', 'the-eighth', true);

-- Storage RLS policies
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'the-eighth');

CREATE POLICY "Authenticated users can upload own entity files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'the-eighth'
  AND auth.role() = 'authenticated'
  AND (
    -- People files: path is "people/entity-name.ext"
    -- Check if path matches image or banner field in people table
    (name LIKE 'people/%' AND
      name IN (
        SELECT image FROM people WHERE owner_id = auth.user_id() AND image IS NOT NULL
        UNION
        SELECT banner FROM people WHERE owner_id = auth.user_id() AND banner IS NOT NULL
      )
    )
    OR
    -- Places files: path is "places/entity-name.ext"
    (name LIKE 'places/%' AND
      name IN (
        SELECT image FROM places WHERE owner_id = auth.user_id() AND image IS NOT NULL
      )
    )
    OR
    -- Achievements files: path is "achievements/entity-name.ext"
    (name LIKE 'achievements/%' AND
      name IN (
        SELECT icon FROM achievements WHERE owner_id = auth.user_id() AND icon IS NOT NULL
      )
    )
  )
);

CREATE POLICY "GMs can upload audio files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'the-eighth'
  AND name LIKE 'audio/%'
  AND auth.is_gm()
);

CREATE POLICY "Users can update own entity files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'the-eighth'
  AND (
    (name LIKE 'people/%' AND
      name IN (
        SELECT image FROM people WHERE owner_id = auth.user_id() AND image IS NOT NULL
        UNION
        SELECT banner FROM people WHERE owner_id = auth.user_id() AND banner IS NOT NULL
      )
    )
    OR
    (name LIKE 'places/%' AND
      name IN (
        SELECT image FROM places WHERE owner_id = auth.user_id() AND image IS NOT NULL
      )
    )
    OR
    (name LIKE 'achievements/%' AND
      name IN (
        SELECT icon FROM achievements WHERE owner_id = auth.user_id() AND icon IS NOT NULL
      )
    )
  )
);

CREATE POLICY "GMs can update audio files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'the-eighth'
  AND name LIKE 'audio/%'
  AND auth.is_gm()
);

CREATE POLICY "Users can delete own entity files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'the-eighth'
  AND (
    (name LIKE 'people/%' AND
      name IN (
        SELECT image FROM people WHERE owner_id = auth.user_id() AND image IS NOT NULL
        UNION
        SELECT banner FROM people WHERE owner_id = auth.user_id() AND banner IS NOT NULL
      )
    )
    OR
    (name LIKE 'places/%' AND
      name IN (
        SELECT image FROM places WHERE owner_id = auth.user_id() AND image IS NOT NULL
      )
    )
    OR
    (name LIKE 'achievements/%' AND
      name IN (
        SELECT icon FROM achievements WHERE owner_id = auth.user_id() AND icon IS NOT NULL
      )
    )
  )
);

CREATE POLICY "GMs can delete audio files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'the-eighth'
  AND name LIKE 'audio/%'
  AND auth.is_gm()
);
```

#### File Migration Process

**Phase 1: Download from Firebase Storage**

```typescript
// scripts/migrate-storage.ts
import admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const firebaseBucket = admin.storage().bucket();
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function migrateFiles() {
  // Get all Firebase Storage files
  const [files] = await firebaseBucket.getFiles();

  for (const file of files) {
    // Download file to temp location
    const tempPath = path.join('/tmp', file.name);
    await file.download({ destination: tempPath });

    // Firebase path format: "collection/entity-name.ext"
    // Example: "places/balan-cantara.jpg"
    // Keep same path format for Supabase (no transformation needed)
    const supabasePath = file.name;

    // Upload to Supabase Storage
    const fileBuffer = fs.readFileSync(tempPath);
    const { data, error } = await supabase.storage
      .from('the-eighth')
      .upload(supabasePath, fileBuffer, {
        contentType: file.metadata.contentType,
        upsert: true
      });

    if (error) {
      console.error(`Failed to upload ${file.name}:`, error);
    } else {
      console.log(`Migrated: ${file.name} (path unchanged)`);
    }

    // Clean up temp file
    fs.unlinkSync(tempPath);
  }
}
```

**Phase 2: Update Database Paths**

```sql
-- NO UPDATES NEEDED!
-- Storage paths are staying the same format: "collection/entity-name.ext"
-- Examples:
--   people.image: "people/balan-cantara.jpg" (unchanged)
--   people.banner: "people/thorwal-banner.jpg" (unchanged)
--   places.image: "places/havena.jpg" (unchanged)
--   achievements.icon: "achievements/first-quest.png" (unchanged)
--   audio files: "audio/santana.mp3" (unchanged)

-- The database already contains the correct paths
-- They will work as-is with Supabase Storage
```

**Phase 3: Update Angular StorageService**

```typescript
// OLD: Firebase Storage
getDownloadURL(path: string): Observable<string> {
  return this.afStorage.ref(path).getDownloadURL();
}

// NEW: Supabase Storage
getPublicUrl(path: string): string {
  const { data } = supabase.storage
    .from('the-eighth')
    .getPublicUrl(path);
  return data.publicUrl;
}

// Upload file
async uploadFile(
  file: File,
  collection: 'people' | 'places' | 'achievements',
  entityName: string // Slugified entity name (e.g., "balan-cantara")
): Promise<string> {
  const extension = file.name.split('.').pop();
  const filePath = `${collection}/${entityName}.${extension}`;

  const { data, error } = await supabase.storage
    .from('the-eighth')
    .upload(filePath, file, { upsert: true });

  if (error) throw error;

  return filePath; // Store this path in database
}

// Helper: Generate slug from entity name
function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .replace(/[\s_-]+/g, '-') // Replace spaces/underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}
```

#### Path Format Change

**Firebase Storage paths** (current):
```
people/balan-cantara.jpg
people/thorwal-banner.jpg
places/havena.jpg
achievements/first-quest.png
audio/santana.mp3
```

**Note**: Paths use entity names (slugs), not IDs. Format: `{collection}/{entity-name}.{extension}`

**Supabase Storage paths** (proposed - keep same format):
```
people/balan-cantara.jpg
people/thorwal-banner.jpg
places/havena.jpg
achievements/first-quest.png
audio/santana.mp3
```

**Key considerations**:
- Keep existing path format: `{collection}/{entity-name}.{ext}`
- No structural changes needed (simpler migration)
- Ownership enforced via RLS policies that query database tables
- **Collision risk**: If two entities have the same name, paths will collide
  - Could mitigate by appending ID on collision: `places/tavern-{id}.jpg`
  - Or enforce unique names per collection

#### Accessing Files in Application

```typescript
// Component usage (images)
<img [src]="getImageUrl(person.image)" />

// Service method (images)
getImageUrl(storagePath: string): string {
  if (!storagePath) return '/assets/placeholder.png';

  return supabase.storage
    .from('the-eighth')
    .getPublicUrl(storagePath)
    .data.publicUrl;
}

// Audio files (AudioPlayerListComponent)
// IMPORTANT: Audio files are now listed from Supabase Storage bucket at runtime
// REMOVED: environment.tenantData[tenant].audioFiles hardcoded config array
// NEW: List files from audio/ folder in Supabase Storage dynamically
const { data: audioFiles } = await supabase.storage
  .from('the-eighth')
  .list('audio');

audioFiles.forEach((file) => {
  const url = supabase.storage
    .from('the-eighth')
    .getPublicUrl(`audio/${file.name}`)
    .data.publicUrl;
  // Use url in audio player
});
```

#### Migration Validation

```typescript
// Verify all files migrated successfully
const { data: files } = await supabase.storage
  .from('the-eighth')
  .list();

console.log(`Total files in Supabase: ${files.length}`);

// Compare with Firebase count
const [firebaseFiles] = await firebaseBucket.getFiles();
console.log(`Total files in Firebase: ${firebaseFiles.length}`);

// Verify database paths updated
const { data: people } = await supabase
  .from('people')
  .select('id, image, banner')
  .not('image', 'is', null);

console.log(`People with images: ${people.length}`);

// Verify audio files migrated
const { data: audioFiles } = await supabase.storage
  .from('the-eighth')
  .list('audio');

console.log(`Audio files in Supabase: ${audioFiles.length}`);
console.log('Audio files:', audioFiles.map(f => f.name));

// Audio files are now dynamically listed from Supabase Storage
// No environment.ts audioFiles config to compare against
// Verify audio folder has expected content by comparing with Firebase export
```

## Service Layer Refactoring

### Files to Modify

**Core Services** (`src/app/core/services/`):

1. **api.service.ts** - Complete rewrite
   - Replace AngularFirestore with Supabase client
   - Replace AngularFireAuth with Supabase auth
   - Convert observables: Firestore auto-returns observables, Supabase returns promises

2. **auth.service.ts** - Update auth flow
   - Replace `firebase.User` type with Supabase `User`
   - Update transformUser() for Supabase user structure
   - Supabase: `{id, email, user_metadata}` vs Firebase: `{uid, email}`

3. **data.service.ts** - Update CRUD operations
   - Replace Firestore queries with SQL-style queries
   - Update access control logic to work with document_access table
   - Handle RLS policies (database enforces, not application)

4. **storage.service.ts** - Complete rewrite for Supabase Storage
   - Replace AngularFireStorage with Supabase Storage client
   - **IMPORTANT**: Firebase Storage will be completely removed
   - API changes:
     - Upload: `supabase.storage.from(bucket).upload(path, file)` replaces `afStorage.ref(path).put(file)`
     - Download URL: `supabase.storage.from(bucket).getPublicUrl(path)` replaces `afStorage.ref(path).getDownloadURL()`
     - Delete: `supabase.storage.from(bucket).remove([path])` replaces `afStorage.ref(path).delete()`
   - Path structure changes: See "Storage Migration" section for new path format
   - Update all components that display images to use new `getPublicUrl()` method
   - **AudioPlayerListComponent** (`src/app/shared/components/audio-player-list/`) - Update to use Supabase Storage
     - Replace `storage.getDownloadURL()` observable with `supabase.storage.getPublicUrl()` (synchronous)
     - Audio file paths remain unchanged: `audio/santana.mp3`

**Feature Services** (`src/app/*/services/`):

All services that query Firestore need updates:
- **PeopleService**: Complex joins for advantages/skills/relationships
- **RulesService**: Query rules table with category filter
- **CombatService**: Query dynamic combat_sessions + combatants
- **ProjectService**: Join with milestones and requirements tables
- All others: Update queries, handle relational data

### Service Refactoring Checklist

For each service (`*.service.ts`):

**1. Import Updates**
- [ ] Replace `AngularFirestore` imports with `SupabaseClient` from `@supabase/supabase-js`
- [ ] Replace `AngularFireAuth` imports with Supabase auth methods
- [ ] Remove Firebase type imports (`Timestamp`, `FieldValue`, etc.)

**2. Static Collection Property**
- [ ] Keep `static collection = 'name'` (same table name)
- [ ] Update references if table name differs from collection name

**3. Observable → Promise Conversion**
- [ ] Convert `.snapshotChanges()` to `realtime.watchTable()` for reactive queries
- [ ] Convert one-time queries to `await supabase.from().select()`
- [ ] Add proper TypeScript types for query results

**4. CRUD Method Updates**
- [ ] **store()**: Replace with `supabase.from().insert()` (new) or `.update()` (existing)
- [ ] **delete()**: Replace with `supabase.from().delete().eq('id', id)`
- [ ] **get()**: Replace with `supabase.from().select()` with appropriate joins
- [ ] **getAll()**: Replace with `supabase.from().select()` (no filter)

**5. Access Control Changes**
- [ ] **REMOVE** `.where('access', 'array-contains', userId)` filters (RLS handles this)
- [ ] Let database RLS policies enforce access control automatically
- [ ] Only add explicit filters for business logic (e.g., `.eq('completed', true)`)

**6. Query Joins & Relations**
- [ ] Add `.select()` with junction table joins using PostgREST embedded resources
- [ ] Example: `select('*, person_advantages(rule_id, level, rules(name))')`
- [ ] Use proper join syntax for hierarchical data (parent_id self-references)

**7. Deserialization Updates**
- [ ] **Firebase**: Transform `Record<id, data>` to arrays manually
- [ ] **Supabase**: PostgREST returns **nested objects** from joins automatically
- [ ] Update deserialization logic to handle new structure

**8. Realtime Subscriptions**
- [ ] Add `.channel()` setup for realtime updates
- [ ] Subscribe to both parent and junction tables (to catch all changes)
- [ ] Add `.unsubscribe()` in `ngOnDestroy()` lifecycle hook
- [ ] Handle subscription cleanup properly

**9. Error Handling**
- [ ] **Firebase**: Catch promise rejections in `.catch()`
- [ ] **Supabase**: Check `{data, error}` response structure
- [ ] Handle `error` object: `if (error) throw error;`

**10. Timestamp Handling**
- [ ] **Firebase**: `Timestamp.fromDate()` and `timestamp.toDate()`
- [ ] **Supabase**: Native JavaScript `Date` objects or ISO strings
- [ ] Update date conversions in queries and responses

**11. Testing**
- [ ] Update unit tests to mock Supabase client
- [ ] Add integration tests against local Supabase instance
- [ ] Verify queries return correct data structure

### Query Pattern Changes

**Firebase**:
```typescript
this.afs.collection('people', ref =>
  ref.where('access', 'array-contains', userId)
).snapshotChanges()
```

**Supabase**:
```typescript
// One-time query
const { data } = await supabase
  .from('people')
  .select('*')
  .contains('access', [userId]); // If keeping array
  // OR use RLS policies (no filter needed)

// Real-time subscription
supabase
  .channel('people-changes')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'people' },
    (payload) => { /* handle update */ }
  )
  .subscribe();
```

**Note**: With RLS enabled, application doesn't need to filter by access - database handles it automatically.

### Real-time Subscriptions Strategy

**Challenge**: Firebase auto-updates observables; Supabase requires explicit subscription setup.

**Solution**: Create reactive wrapper service:

```typescript
// supabase-realtime.service.ts
@Injectable({ providedIn: 'root' })
export class SupabaseRealtimeService {
  private subscriptions = new Map<string, ReplaySubject<any>>();

  // Generic realtime query
  watchTable<T>(
    table: string,
    query: (qb) => any,
    transformFn: (data: any[]) => T[]
  ): Observable<T[]> {
    const key = `${table}:${JSON.stringify(query)}`;

    if (!this.subscriptions.has(key)) {
      const subject = new ReplaySubject<T[]>(1);

      // Initial fetch
      query(supabase.from(table))
        .then(({ data }) => subject.next(transformFn(data)));

      // Subscribe to changes
      supabase
        .channel(`${table}-changes-${key}`)
        .on('postgres_changes',
          { event: '*', schema: 'public', table },
          () => {
            // Re-fetch on any change
            query(supabase.from(table))
              .then(({ data }) => subject.next(transformFn(data)));
          }
        )
        .subscribe();

      this.subscriptions.set(key, subject);
    }

    return this.subscriptions.get(key).asObservable();
  }
}
```

**Usage in feature services**:

```typescript
// people.service.ts
getPeople(): Observable<Person[]> {
  return this.realtime.watchTable(
    'people',
    (qb) => qb.select(`
      *,
      person_advantages!inner (rule_id, level, details, rules(name)),
      person_skills!inner (rule_id, value, rules(name))
    `),
    (data) => this.deserializePeople(data)
  );
}
```

**Important**: Supabase Realtime triggers on **table-level changes**, not query results. This means:
- ✅ Detects new person added
- ✅ Detects person updated
- ⚠️ **Does NOT detect** when person_advantages row added (different table!)

**Solution for junction table updates**:

```typescript
// Subscribe to both parent and junction tables
combineLatest([
  this.realtime.watchTable('people', ...),
  this.realtime.watchTable('person_advantages', ...) // Triggers re-fetch
]).pipe(
  map(([people, _]) => people) // Ignore junction data, just use as trigger
);
```

## Migration Order

Execute in this sequence to maintain referential integrity:

1. ✅ **Independent tables**: users, user_roles, rules_config, allowed_attributes, hit_locations, combat_states
2. ✅ **Rules**: Seed static rules from `assets/{tenant}/rules.json` + migrate dynamic rules from Firestore `rules` collection
3. ✅ **Timelines** (BEFORE campaign - campaign.timeline_id references timelines)
4. ✅ **Core entities (no FKs yet)**: people, places, quests (all with parent_id/location_id NULL for now), projects, achievements, inventory, notes, rolls
5. ✅ **Campaign** (AFTER places AND timelines - needs ship_id FK to places, timeline_id FK to timelines)
6. ✅ **Flows**: flows, flow_items (after people/places/quests/notes exist)
7. ✅ **Hierarchical FKs**: Update places.parent_id, quests.parent_id, people.location_id, campaign.ship_id, campaign.timeline_id (second pass)
8. ✅ **Junction tables**: person_attributes, person_tags, person_advantages, person_disadvantages, person_feats, person_skills, person_spells, person_cantrips, person_liturgies, project_milestones, project_requirements, achievement_people
9. ✅ **Person relationships**: Third pass after all people exist
10. ✅ **Derived tables**: info_boxes, historic_events
11. ✅ **Combat**: combat_sessions, combatants, combatant_attributes (for enemies only), combatant_states
12. ✅ **Access control**: document_access (last, after all entities exist, ONLY explicit grants - exclude owner and GMs)

## Rollback Strategy

1. Keep Firebase as primary during validation
2. Run application in read-only mode against PostgreSQL
3. Compare queries between Firebase and PostgreSQL results
4. Once validated, switch writes to PostgreSQL
5. Keep Firebase backup for 30 days before decommissioning

## Validation Queries

Run these SQL queries after migration to verify data integrity:

### Row Count Validation

```sql
-- Compare against Firebase export JSON line counts
SELECT 'users' as table_name, COUNT(*) as row_count FROM users
UNION ALL
SELECT 'people', COUNT(*) FROM people
UNION ALL
SELECT 'places', COUNT(*) FROM places
UNION ALL
SELECT 'quests', COUNT(*) FROM quests
UNION ALL
SELECT 'projects', COUNT(*) FROM projects
UNION ALL
SELECT 'achievements', COUNT(*) FROM achievements
UNION ALL
SELECT 'inventory', COUNT(*) FROM inventory
UNION ALL
SELECT 'notes', COUNT(*) FROM notes
UNION ALL
SELECT 'rolls', COUNT(*) FROM rolls
UNION ALL
SELECT 'flows', COUNT(*) FROM flows
UNION ALL
SELECT 'flow_items', COUNT(*) FROM flow_items
UNION ALL
SELECT 'rules', COUNT(*) FROM rules
UNION ALL
SELECT 'info_boxes', COUNT(*) FROM info_boxes
UNION ALL
SELECT 'historic_events', COUNT(*) FROM historic_events
UNION ALL
SELECT 'combat_sessions', COUNT(*) FROM combat_sessions
UNION ALL
SELECT 'combatants', COUNT(*) FROM combatants
ORDER BY table_name;
```

### Referential Integrity Validation

```sql
-- Check for orphaned foreign keys
-- People → Places
SELECT p.id, p.name, p.location_id
FROM people p
WHERE p.location_id IS NOT NULL
  AND p.location_id NOT IN (SELECT id FROM places);

-- Places → Places (parent hierarchy)
SELECT pl.id, pl.name, pl.parent_id
FROM places pl
WHERE pl.parent_id IS NOT NULL
  AND pl.parent_id NOT IN (SELECT id FROM places);

-- Quests → Quests (parent hierarchy)
SELECT q.id, q.name, q.parent_id
FROM quests q
WHERE q.parent_id IS NOT NULL
  AND q.parent_id NOT IN (SELECT id FROM quests);

-- Combatants → People
SELECT c.id, c.person_id
FROM combatants c
WHERE c.person_id IS NOT NULL
  AND c.person_id NOT IN (SELECT id FROM people);

-- Campaign → Places (ship_id)
SELECT c.id, c.name, c.ship_id
FROM campaign c
WHERE c.ship_id IS NOT NULL
  AND c.ship_id NOT IN (SELECT id FROM places);

-- Flow items → Referenced entities
SELECT fi.id, fi.type, fi.entity_id
FROM flow_items fi
WHERE fi.type = 'person' AND fi.entity_id NOT IN (SELECT id FROM people)
   OR fi.type = 'place' AND fi.entity_id NOT IN (SELECT id FROM places)
   OR fi.type = 'quest' AND fi.entity_id NOT IN (SELECT id FROM quests)
   OR fi.type = 'note' AND fi.entity_id NOT IN (SELECT id FROM notes);
```

### Junction Table Integrity Validation

```sql
-- Person advantages → Valid people + rules
SELECT pa.id, pa.person_id, pa.rule_id
FROM person_advantages pa
LEFT JOIN people p ON pa.person_id = p.id
LEFT JOIN rules r ON pa.rule_id = r.id
WHERE p.id IS NULL OR r.id IS NULL;

-- Person skills → Valid people + rules
SELECT ps.id, ps.person_id, ps.rule_id
FROM person_skills ps
LEFT JOIN people p ON ps.person_id = p.id
LEFT JOIN rules r ON ps.rule_id = r.id
WHERE p.id IS NULL OR r.id IS NULL;

-- Achievement people → Valid achievements + people
SELECT ap.id, ap.achievement_id, ap.person_id
FROM achievement_people ap
LEFT JOIN achievements a ON ap.achievement_id = a.id
LEFT JOIN people p ON ap.person_id = p.id
WHERE a.id IS NULL OR p.id IS NULL;

-- Person relationships → Both people exist
SELECT pr.id, pr.person_id, pr.related_person_id
FROM person_relationships pr
LEFT JOIN people p1 ON pr.person_id = p1.id
LEFT JOIN people p2 ON pr.related_person_id = p2.id
WHERE p1.id IS NULL OR p2.id IS NULL;
```

### Access Control Validation

```sql
-- Verify document_access only has explicit grants (no owners, no GMs)
-- This query should return 0 rows for proper migration
SELECT da.*, u.name, ur.role,
       CASE
         WHEN da.entity_type = 'person' THEN (SELECT owner_id FROM people WHERE id = da.entity_id::uuid)
         WHEN da.entity_type = 'place' THEN (SELECT owner_id FROM places WHERE id = da.entity_id::uuid)
         WHEN da.entity_type = 'quest' THEN (SELECT owner_id FROM quests WHERE id = da.entity_id::uuid)
       END as owner_id
FROM document_access da
JOIN users u ON da.user_id = u.id
LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.role = 'gm'
WHERE ur.role = 'gm' -- GMs should not be in document_access
   OR da.user_id = (
     CASE
       WHEN da.entity_type = 'person' THEN (SELECT owner_id FROM people WHERE id = da.entity_id::uuid)
       WHEN da.entity_type = 'place' THEN (SELECT owner_id FROM places WHERE id = da.entity_id::uuid)
       WHEN da.entity_type = 'quest' THEN (SELECT owner_id FROM quests WHERE id = da.entity_id::uuid)
     END
   ); -- Owners should not be in document_access
```

### Hierarchical Data Validation

```sql
-- Test places hierarchy (no circular references)
WITH RECURSIVE place_hierarchy AS (
  SELECT id, name, parent_id, 0 as depth, ARRAY[id] as path
  FROM places
  WHERE parent_id IS NULL

  UNION ALL

  SELECT p.id, p.name, p.parent_id, ph.depth + 1, ph.path || p.id
  FROM places p
  JOIN place_hierarchy ph ON p.parent_id = ph.id
  WHERE NOT (p.id = ANY(ph.path)) -- Detect circular references
)
SELECT * FROM place_hierarchy
WHERE depth > 10 -- Flag suspiciously deep hierarchies
ORDER BY depth DESC;

-- Test quests hierarchy (no circular references)
WITH RECURSIVE quest_hierarchy AS (
  SELECT id, name, parent_id, 0 as depth, ARRAY[id] as path
  FROM quests
  WHERE parent_id IS NULL

  UNION ALL

  SELECT q.id, q.name, q.parent_id, qh.depth + 1, qh.path || q.id
  FROM quests q
  JOIN quest_hierarchy qh ON q.parent_id = qh.id
  WHERE NOT (q.id = ANY(qh.path)) -- Detect circular references
)
SELECT * FROM quest_hierarchy
WHERE depth > 10 -- Flag suspiciously deep hierarchies
ORDER BY depth DESC;
```

### Combat Data Validation

```sql
-- Verify enemy combatants have attributes, person combatants don't duplicate them
SELECT c.id, c.name, c.person_id,
       COUNT(ca.id) as attribute_count
FROM combatants c
LEFT JOIN combatant_attributes ca ON c.id = ca.combatant_id
GROUP BY c.id, c.name, c.person_id
HAVING (c.person_id IS NULL AND COUNT(ca.id) = 0) -- Enemies should have attributes
    OR (c.person_id IS NOT NULL AND COUNT(ca.id) > 0); -- Person combatants should NOT have combatant_attributes
```

### Rules Migration Validation

```sql
-- Verify both static and custom rules were migrated
SELECT
  category,
  COUNT(*) as total_rules,
  COUNT(*) FILTER (WHERE is_static = true) as static_rules,
  COUNT(*) FILTER (WHERE is_custom = true) as custom_rules
FROM rules
GROUP BY category
ORDER BY category;

-- Check for rules without category (should be 0)
SELECT * FROM rules WHERE category IS NULL;
```

## Testing Checklist

- [ ] All row counts match between Firebase export and PostgreSQL
- [ ] Foreign key constraints validated (no orphaned references)
- [ ] RLS policies tested with each role (observer, player, co_gm, gm)
- [ ] Hierarchical queries work (places tree, quests tree, no circular references)
- [ ] Junction table queries return correct data (person skills, advantages, etc.)
- [ ] Real-time subscriptions work
- [ ] Auth flow works (login/logout with manually set passwords)
- [ ] **isGM computed property works** (UserService correctly derives isGM from user_roles)
- [ ] File storage paths accessible
- [ ] **Audio files migrated and accessible** (verify audio/ folder in Supabase Storage)
- [ ] **Audio player component works** (AudioPlayerListComponent loads and plays audio)
- [ ] Access control works (owners, GMs, explicit grants)
- [ ] Hybrid permissions tested (role + per-document)
- [ ] document_access table only has explicit grants (no owners, no GMs)
- [ ] Combat session queries work (enemies have attributes, people reference person_attributes)
- [ ] Project milestones/requirements queries work
- [ ] Person relationships bidirectional
- [ ] Rules migration complete (static + custom rules)

## Authentication Migration Strategy

**Decision**: Passwords will be set manually in Supabase Auth database.

Since this is a small user base, the migration approach is:

1. **Create Supabase Auth users manually** with known passwords
2. **Map Firebase UID to Supabase UUID** via `users.firebase_uid` column
3. **Distribute new credentials** to users out-of-band (email/message)

**Implementation**:

```sql
-- Create user in Supabase Auth (via Dashboard or service role API)
-- Then insert into public.users table with mapping:
INSERT INTO users (id, firebase_uid, name, ...)
VALUES (
  'new-supabase-auth-uuid',  -- From Supabase Auth user creation
  'old-firebase-uid',         -- From Firebase export
  'User Name',
  ...
);
```

**Post-migration**: Users log in with email + new password. The `firebase_uid` column is kept for audit trail but not used at runtime.

## isGM Property Migration

**Decision**: Compute `isGM` in UserService from `user_roles` table.

The current codebase uses `user.isGM` in 18+ locations. Rather than updating all templates, the UserService will compute this property when fetching users.

**Implementation in UserService**:

```typescript
// user.service.ts
getUsers(): Observable<User[]> {
  return from(supabase
    .from('users')
    .select(`
      *,
      user_roles!inner(role)
    `)
  ).pipe(
    map(({ data }) => data.map(user => ({
      ...user,
      // Compute isGM from user_roles
      isGM: user.user_roles?.some(r => r.role === 'gm') ?? false
    })))
  );
}
```

This ensures backward compatibility with existing template code like `*ngIf="user.isGM"`.

## Environment Configuration

**New environment structure** (replaces Firebase config):

```typescript
// src/environments/environment.ts
export const environment = {
  name: 'dev',
  production: false,
  tenant: process.env.NG_APP_TENANT.trim(),
  supabase: {
    url: 'http://localhost:54321',  // Local Supabase
    anonKey: 'eyJ...',              // Local anon key
  },
  // REMOVED: tenantData[tenant].firebase
  // REMOVED: tenantData[tenant].audioFiles (now listed from Storage)
};

// src/environments/environment.prod.ts
export const environment = {
  name: 'prod',
  production: true,
  tenant: process.env.NG_APP_TENANT.trim(),
  supabase: {
    url: 'https://your-project.supabase.co',
    anonKey: 'production-anon-key',
  },
};
```

**Supabase client provider** (in CoreModule or standalone):

```typescript
// src/app/core/supabase.provider.ts
import { InjectionToken } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

export const SUPABASE_CLIENT = new InjectionToken<SupabaseClient>('supabase');

export function supabaseFactory(): SupabaseClient {
  return createClient(
    environment.supabase.url,
    environment.supabase.anonKey
  );
}

export const supabaseProvider = {
  provide: SUPABASE_CLIENT,
  useFactory: supabaseFactory,
};
```

## Next Steps

1. **Set up local Supabase**:
   ```bash
   npm install supabase --save-dev
   npx supabase init
   npx supabase start
   ```

2. **Create migration SQL files**:
   - `supabase/migrations/001_initial_schema.sql` - All table definitions
   - `supabase/migrations/002_rls_policies.sql` - All RLS policies
   - `supabase/migrations/003_functions_triggers.sql` - Helper functions and triggers

3. **Write migration scripts**:
   - `scripts/validate-firebase-data.ts` - **PRE-MIGRATION**: Check orphaned refs, circular deps, invalid data
   - `scripts/firebase-export.ts` - Export Firebase data to JSON
   - `scripts/transform-and-migrate.ts` - Transform and load into PostgreSQL
   - `scripts/migrate-storage.ts` - Migrate files from Firebase Storage to Supabase Storage
   - `scripts/validate-migration.ts` - **POST-MIGRATION**: Compare data integrity

4. **Update Angular dependencies**:
   ```bash
   # Install Supabase
   npm install @supabase/supabase-js

   # Remove Firebase packages (AFTER migration is complete and validated)
   npm uninstall @angular/fire firebase
   npm uninstall firebase-admin  # Dev dependency for migration scripts
   ```

5. **Update Angular services**:
   - Create Supabase client provider in CoreModule
   - Rewrite ApiService for Supabase
   - Rewrite AuthService for Supabase Auth
   - Rewrite StorageService for Supabase Storage
   - Update all feature services

6. **Remove Firebase configuration**:
   - Delete `environment.tenantData[tenant].firebase` config objects
   - Remove Firebase initialization code from CoreModule
   - Delete any remaining Firebase imports

7. **Test incrementally**:
   - Start with one feature module (e.g., projects - simpler than people)
   - Test locally against Supabase
   - Verify all CRUD operations work
   - Verify file uploads/downloads work
   - Gradually validate all features

8. **Final cleanup**:
   - Remove Firebase service account JSON files
   - Delete Firebase-related environment variables
   - Update documentation to remove Firebase references
   - Archive Firebase export data for backup

## Infrastructure Considerations

### Connection Pooling

**Problem**: PostgreSQL has a limited number of connections (default ~100). Angular apps create many concurrent connections.

**Solution**: Use PgBouncer connection pooling:

```bash
# supabase/config.toml
[db]
pooler_enabled = true
pool_mode = "transaction" # or "session" for complex transactions
default_pool_size = 20
max_client_conn = 100
```

**Application config**:
```typescript
// Use pooler connection string for queries
const supabase = createClient(
  'https://your-project.supabase.co',
  'public-anon-key',
  {
    db: {
      schema: 'public',
    },
    global: {
      headers: { 'x-connection-mode': 'transaction' }
    }
  }
);
```

### Monitoring & Performance

**Query performance logging**:
```sql
-- Enable slow query logging
ALTER DATABASE postgres SET log_min_duration_statement = 1000; -- Log queries > 1s

-- Create extension for query stats
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- View slow queries
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;
```

**RLS policy performance**:
```sql
-- Check if RLS is slowing queries
EXPLAIN ANALYZE SELECT * FROM people WHERE owner_id = 'user-id';
```

### Backup Strategy

**Supabase automated backups**:
- Point-in-time recovery (PITR) enabled by default (7 days retention)
- Daily backups to S3

**Manual backup script**:
```bash
# Local backup
pg_dump -h db.your-project.supabase.co \
  -U postgres \
  -d postgres \
  -F c \
  -f backup-$(date +%Y%m%d).dump

# Restore
pg_restore -h db.your-project.supabase.co \
  -U postgres \
  -d postgres \
  backup-20260114.dump
```

### Development Workflow

**Local Supabase setup**:
```bash
# Install Supabase CLI
npm install -g supabase

# Initialize project
supabase init

# Start local stack (PostgreSQL + Auth + Storage + Realtime)
supabase start

# Apply migrations
supabase db reset

# Generate TypeScript types from schema
supabase gen types typescript --local > src/types/supabase.ts
```

**Environment configuration**:
```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  supabase: {
    url: 'http://localhost:54321', // Local Supabase
    anonKey: 'local-anon-key'
  }
};

// src/environments/environment.prod.ts
export const environment = {
  production: true,
  supabase: {
    url: 'https://your-project.supabase.co',
    anonKey: 'production-anon-key'
  }
};
```

**Migration workflow**:
```bash
# Create new migration
supabase migration new add_flows_table

# Test locally
supabase db reset

# Push to production
supabase db push
```

### Testing Strategy

**Unit tests** - Mock Supabase client:
```typescript
const mockSupabase = {
  from: jest.fn().mockReturnValue({
    select: jest.fn().mockResolvedValue({ data: [], error: null }),
    insert: jest.fn().mockResolvedValue({ data: null, error: null }),
  })
};
```

**Integration tests** - Use local Supabase instance:
```typescript
describe('PeopleService', () => {
  let supabase: SupabaseClient;

  beforeAll(async () => {
    // Connect to local Supabase
    supabase = createClient('http://localhost:54321', 'local-key');
    // Seed test data
    await seedDatabase(supabase);
  });

  it('should fetch people with RLS applied', async () => {
    // Test actual queries against local DB
  });
});
```

**E2E tests** - Test full user flows:
```typescript
// Use Cypress/Playwright against local Supabase
```

### Security Checklist

- [ ] All tables have RLS enabled
- [ ] Auth policies tested for each role (observer, player, co_gm, gm)
- [ ] Document access tested (owner, GM, explicit grants)
- [ ] Injection attacks prevented (parameterized queries only)
- [ ] Storage bucket policies configured (file upload restrictions)
- [ ] API keys rotated (anon key vs service_role key)
- [ ] HTTPS enforced in production

## Critical Files

**Migration scripts** (to create):
- `scripts/firebase-export.ts` - Export Firestore collections to JSON
- `scripts/transform-and-migrate.ts` - Transform and load data into PostgreSQL
- `scripts/migrate-storage.ts` - Migrate files from Firebase Storage to Supabase Storage
- `scripts/validate-migration.ts` - Comprehensive data validation
- `scripts/validate-firebase-data.ts` - **PRE-MIGRATION** validation (must pass before export):
  - Orphaned `location_id` references (person → deleted place)
  - Orphaned `parent_id` references (place/quest → deleted parent)
  - Circular hierarchies in places/quests
  - Invalid `access` arrays (references to deleted users)
  - Orphaned flow items (references to deleted entities)
  - Combatants referencing deleted people
- `supabase/migrations/001_initial_schema.sql` - All table definitions
- `supabase/migrations/002_rls_policies.sql` - All RLS policies
- `supabase/migrations/003_storage_buckets.sql` - Storage bucket and policies

**Service layer** (to modify/rewrite):
- `src/app/core/core.module.ts` - **REMOVE** AngularFire, **ADD** Supabase provider
- `src/app/core/services/api.service.ts` - **COMPLETE REWRITE** for Supabase
- `src/app/core/services/supabase-realtime.service.ts` - **NEW**: Reactive wrapper for real-time subscriptions
- `src/app/core/services/auth.service.ts` - **REWRITE** for Supabase Auth (remove Firebase Auth)
- `src/app/core/services/data.service.ts` - Update CRUD with Supabase queries
- `src/app/core/services/storage.service.ts` - **COMPLETE REWRITE** for Supabase Storage (remove Firebase Storage)
- `src/app/people/services/people.service.ts` - Complex joins for normalized data
- `src/app/flow/services/flow.service.ts` - Handle flow_items joins
- `src/app/combat/services/combat.service.ts` - Dynamic combat sessions
- All other feature services

**Files to delete** (after migration complete):
- Firebase service account JSON files
- Any Firebase-specific configuration files
- `@angular/fire` imports throughout codebase

**Data models** (to update):
- All `*.db.ts` files - Update interfaces to match new schema
- All `*.model.ts` files - Update types for relational data
- `src/types/supabase.ts` - NEW: Auto-generated from schema
