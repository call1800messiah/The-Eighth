-- ============================================================================
-- Initial Schema Migration for TheEighth
-- Migrates from Firebase Firestore to PostgreSQL/Supabase
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE user_role AS ENUM ('observer', 'player', 'co_gm', 'gm');
CREATE TYPE rule_category AS ENUM ('advantage', 'disadvantage', 'feat', 'skill', 'spell', 'cantrip', 'liturgy');
CREATE TYPE roll_type AS ENUM ('attribute', 'skill', 'skill5', 'damage', 'dice');
CREATE TYPE flow_item_type AS ENUM ('person', 'place', 'quest', 'note');
CREATE TYPE info_type AS ENUM ('appearance', 'background', 'note', 'character', 'goals', 'reward');

-- ============================================================================
-- CORE SYSTEM TABLES
-- ============================================================================

-- Users table (mirrors Supabase Auth users with additional fields)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  firebase_uid TEXT UNIQUE, -- For migration mapping, not used at runtime
  name TEXT NOT NULL,
  view_ancestry BOOLEAN DEFAULT false,
  view_banner BOOLEAN DEFAULT false,
  view_location BOOLEAN DEFAULT false,
  view_name BOOLEAN DEFAULT false,
  view_title BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User roles (users can have multiple roles)
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'player',
  UNIQUE(user_id, role)
);

-- Document access (explicit per-document sharing, NOT for owners/GMs)
CREATE TABLE document_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL, -- 'person', 'place', 'quest', 'flow', etc.
  entity_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(entity_type, entity_id, user_id)
);

-- ============================================================================
-- RULES CONFIGURATION TABLES (seeded from assets/{tenant}/rules.json)
-- ============================================================================

-- Allowed attributes for person stats
CREATE TABLE allowed_attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant TEXT NOT NULL, -- 'tde5', 'the-eighth', etc.
  name TEXT NOT NULL,
  short_code TEXT NOT NULL,
  display_style TEXT NOT NULL, -- 'number' or 'bar'
  sort_order INTEGER NOT NULL,
  roll_type TEXT, -- 'attribute' or NULL
  UNIQUE(tenant, short_code)
);

-- Hit locations for combat
CREATE TABLE hit_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant TEXT NOT NULL,
  roll_value INTEGER NOT NULL, -- 1-20 on d20
  location_name TEXT NOT NULL,
  UNIQUE(tenant, roll_value)
);

-- Combat states/conditions
CREATE TABLE combat_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant TEXT NOT NULL,
  name TEXT NOT NULL,
  UNIQUE(tenant, name)
);

-- Rules config metadata
CREATE TABLE rules_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant TEXT NOT NULL UNIQUE,
  edition INTEGER NOT NULL,
  addable_rule_types JSONB NOT NULL -- Schema for custom rule fields
);

-- Rules (both static from JSON and custom user-created)
CREATE TABLE rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category rule_category NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_static BOOLEAN DEFAULT false, -- TRUE for seeded rules from JSON
  is_custom BOOLEAN DEFAULT false, -- TRUE for user-created rules
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TIMELINES (must be created before campaign due to FK)
-- ============================================================================

CREATE TABLE timelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Historic events (replaces timelines/{id}/events subcollection)
CREATE TABLE historic_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timeline_id UUID NOT NULL REFERENCES timelines(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  date TEXT, -- Event date as string
  type TEXT, -- Event type
  owner_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  modified_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PLACES (hierarchical with parent_id)
-- ============================================================================

CREATE TABLE places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'city', 'building', 'region', etc.
  image TEXT, -- Storage path
  inhabitants TEXT, -- Description of inhabitants
  parent_id UUID REFERENCES places(id), -- Self-referencing for hierarchy
  owner_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PEOPLE
-- ============================================================================

CREATE TABLE people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  location_id UUID REFERENCES places(id), -- FK to places
  xp INTEGER DEFAULT 0,
  owner_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Person junction tables

CREATE TABLE person_advantages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES rules(id) ON DELETE CASCADE,
  level TEXT,
  details TEXT,
  UNIQUE(person_id, rule_id)
);

CREATE TABLE person_disadvantages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES rules(id) ON DELETE CASCADE,
  level TEXT,
  details TEXT,
  UNIQUE(person_id, rule_id)
);

CREATE TABLE person_feats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES rules(id) ON DELETE CASCADE,
  level TEXT,
  details TEXT,
  UNIQUE(person_id, rule_id)
);

CREATE TABLE person_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES rules(id) ON DELETE CASCADE,
  value INTEGER NOT NULL,
  UNIQUE(person_id, rule_id)
);

CREATE TABLE person_spells (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES rules(id) ON DELETE CASCADE,
  value INTEGER NOT NULL,
  UNIQUE(person_id, rule_id)
);

CREATE TABLE person_cantrips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES rules(id) ON DELETE CASCADE,
  value INTEGER NOT NULL,
  UNIQUE(person_id, rule_id)
);

CREATE TABLE person_liturgies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES rules(id) ON DELETE CASCADE,
  value INTEGER NOT NULL,
  UNIQUE(person_id, rule_id)
);

CREATE TABLE person_attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'lep', 'asp', etc.
  current INTEGER NOT NULL,
  max INTEGER NOT NULL,
  UNIQUE(person_id, type)
);

CREATE TABLE person_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  UNIQUE(person_id, tag)
);

-- Person relationships (parent, child, sibling, partner, relative types)
CREATE TABLE person_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  related_person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL, -- 'parent', 'child', 'sibling', 'partner', 'uncle', 'cousin', etc.
  UNIQUE(person_id, related_person_id, relationship_type),
  CHECK (person_id != related_person_id)
);

-- ============================================================================
-- QUESTS (hierarchical with parent_id)
-- ============================================================================

CREATE TABLE quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- Quest type
  description TEXT,
  completed BOOLEAN DEFAULT false,
  parent_id UUID REFERENCES quests(id), -- Self-referencing for hierarchy
  owner_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PROJECTS
-- ============================================================================

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  benefit TEXT,
  interval TEXT,
  owner_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE project_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  description TEXT,
  required_points INTEGER NOT NULL,
  sort_order INTEGER
);

CREATE TABLE project_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  skill TEXT NOT NULL,
  current_points INTEGER DEFAULT 0,
  required_points INTEGER NOT NULL,
  threshold INTEGER NOT NULL,
  sort_order INTEGER
);

-- ============================================================================
-- ACHIEVEMENTS
-- ============================================================================

CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- Storage path
  unlocked TIMESTAMPTZ NOT NULL,
  owner_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE achievement_people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  UNIQUE(achievement_id, person_id)
);

-- ============================================================================
-- INVENTORY
-- ============================================================================

CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  character TEXT, -- Person name (not FK, just string)
  owner_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- NOTES
-- ============================================================================

CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  content TEXT,
  category TEXT,
  owner_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  modified_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ROLLS (dice roll history)
-- ============================================================================

CREATE TABLE rolls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type roll_type NOT NULL,
  owner_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),

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

-- ============================================================================
-- FLOWS
-- ============================================================================

CREATE TABLE flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  date TIMESTAMPTZ NOT NULL,
  owner_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE flow_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL REFERENCES flows(id) ON DELETE CASCADE,
  type flow_item_type NOT NULL,
  entity_id UUID NOT NULL, -- Reference to people/places/quests/notes
  sort_order INTEGER NOT NULL,
  UNIQUE(flow_id, sort_order)
);

-- ============================================================================
-- CAMPAIGN (singleton table)
-- ============================================================================

CREATE TABLE campaign (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  captain TEXT,
  crewcount INTEGER,
  date TEXT,
  ship TEXT, -- Legacy ship name (kept for backward compatibility)
  ship_id UUID REFERENCES places(id), -- FK to places (preferred)
  stamina_reduction INTEGER,
  timeline_id UUID REFERENCES timelines(id), -- FK to timelines
  xp INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INFO BOXES (polymorphic - replaces subcollections)
-- ============================================================================

CREATE TABLE info_boxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type info_type NOT NULL,
  content TEXT NOT NULL,
  entity_type TEXT NOT NULL, -- 'person', 'place', 'quest'
  entity_id UUID NOT NULL,
  owner_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  modified_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- COMBAT
-- ============================================================================

CREATE TABLE combat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE combatants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  combat_session_id UUID NOT NULL REFERENCES combat_sessions(id) ON DELETE CASCADE,
  person_id UUID REFERENCES people(id), -- NULL for generic enemies
  name TEXT, -- For non-person combatants (NULL if person_id set)
  initiative INTEGER,
  active BOOLEAN DEFAULT true,
  CHECK ((person_id IS NULL AND name IS NOT NULL) OR (person_id IS NOT NULL AND name IS NULL))
);

-- Combat attributes (stored for enemies only, people reference person_attributes)
CREATE TABLE combatant_attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  combatant_id UUID NOT NULL REFERENCES combatants(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'lep', 'asp', etc.
  current INTEGER NOT NULL,
  max INTEGER NOT NULL,
  UNIQUE(combatant_id, type)
);

-- Combat states (status effects like "prone", "bleeding")
CREATE TABLE combatant_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  combatant_id UUID NOT NULL REFERENCES combatants(id) ON DELETE CASCADE,
  state TEXT NOT NULL -- References combat_states.name
);

-- ============================================================================
-- INDEXES
-- ============================================================================

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
CREATE INDEX idx_achievements_unlocked ON achievements(unlocked DESC);

-- Inventory
CREATE INDEX idx_inventory_owner ON inventory(owner_id);

-- Notes
CREATE INDEX idx_notes_owner ON notes(owner_id);

-- Rolls
CREATE INDEX idx_rolls_owner ON rolls(owner_id);
CREATE INDEX idx_rolls_created ON rolls(created_at DESC);
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
CREATE INDEX idx_rules_static ON rules(is_static) WHERE is_static = true;
CREATE INDEX idx_rules_custom ON rules(is_custom) WHERE is_custom = true;
