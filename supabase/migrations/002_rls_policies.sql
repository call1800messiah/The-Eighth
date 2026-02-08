-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get the current authenticated user's ID
-- Uses auth.uid() which is built into Supabase
CREATE OR REPLACE FUNCTION public.current_user_id() RETURNS UUID AS $$
  SELECT auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Check if the current user is a GM
CREATE OR REPLACE FUNCTION public.is_gm() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'gm'
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ============================================================================
-- USERS TABLE
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Anyone can read users (for display names, etc.)
CREATE POLICY users_select_policy ON users
  FOR SELECT
  USING (true);

-- Only the user can update their own profile
CREATE POLICY users_update_policy ON users
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================================================
-- USER ROLES TABLE
-- ============================================================================

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read roles
CREATE POLICY user_roles_select_policy ON user_roles
  FOR SELECT
  USING (true);

-- Only GMs can manage roles
CREATE POLICY user_roles_insert_policy ON user_roles
  FOR INSERT
  WITH CHECK (is_gm());

CREATE POLICY user_roles_update_policy ON user_roles
  FOR UPDATE
  USING (is_gm())
  WITH CHECK (is_gm());

CREATE POLICY user_roles_delete_policy ON user_roles
  FOR DELETE
  USING (is_gm());

-- ============================================================================
-- DOCUMENT ACCESS TABLE
-- ============================================================================

ALTER TABLE document_access ENABLE ROW LEVEL SECURITY;

-- Users can see their own access grants
CREATE POLICY document_access_select_policy ON document_access
  FOR SELECT
  USING (user_id = auth.uid() OR is_gm());

-- Entity owners and GMs can grant access
CREATE POLICY document_access_insert_policy ON document_access
  FOR INSERT
  WITH CHECK (is_gm());

-- Only GMs can delete access grants
CREATE POLICY document_access_delete_policy ON document_access
  FOR DELETE
  USING (is_gm());

-- ============================================================================
-- PEOPLE TABLE
-- ============================================================================

ALTER TABLE people ENABLE ROW LEVEL SECURITY;

CREATE POLICY people_select_policy ON people
  FOR SELECT
  USING (
    owner_id = auth.uid() OR
    is_gm() OR
    EXISTS (
      SELECT 1 FROM document_access
      WHERE entity_type = 'person'
      AND entity_id = people.id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY people_insert_policy ON people
  FOR INSERT
  WITH CHECK (owner_id = auth.uid() OR is_gm());

CREATE POLICY people_update_policy ON people
  FOR UPDATE
  USING (owner_id = auth.uid() OR is_gm())
  WITH CHECK (owner_id = auth.uid() OR is_gm());

CREATE POLICY people_delete_policy ON people
  FOR DELETE
  USING (owner_id = auth.uid() OR is_gm());

-- ============================================================================
-- PLACES TABLE
-- ============================================================================

ALTER TABLE places ENABLE ROW LEVEL SECURITY;

CREATE POLICY places_select_policy ON places
  FOR SELECT
  USING (
    owner_id = auth.uid() OR
    is_gm() OR
    EXISTS (
      SELECT 1 FROM document_access
      WHERE entity_type = 'place'
      AND entity_id = places.id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY places_insert_policy ON places
  FOR INSERT
  WITH CHECK (owner_id = auth.uid() OR is_gm());

CREATE POLICY places_update_policy ON places
  FOR UPDATE
  USING (owner_id = auth.uid() OR is_gm())
  WITH CHECK (owner_id = auth.uid() OR is_gm());

CREATE POLICY places_delete_policy ON places
  FOR DELETE
  USING (owner_id = auth.uid() OR is_gm());

-- ============================================================================
-- QUESTS TABLE
-- ============================================================================

ALTER TABLE quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY quests_select_policy ON quests
  FOR SELECT
  USING (
    owner_id = auth.uid() OR
    is_gm() OR
    EXISTS (
      SELECT 1 FROM document_access
      WHERE entity_type = 'quest'
      AND entity_id = quests.id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY quests_insert_policy ON quests
  FOR INSERT
  WITH CHECK (owner_id = auth.uid() OR is_gm());

CREATE POLICY quests_update_policy ON quests
  FOR UPDATE
  USING (owner_id = auth.uid() OR is_gm())
  WITH CHECK (owner_id = auth.uid() OR is_gm());

CREATE POLICY quests_delete_policy ON quests
  FOR DELETE
  USING (owner_id = auth.uid() OR is_gm());

-- ============================================================================
-- PROJECTS TABLE
-- ============================================================================

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY projects_select_policy ON projects
  FOR SELECT
  USING (
    owner_id = auth.uid() OR
    is_gm() OR
    EXISTS (
      SELECT 1 FROM document_access
      WHERE entity_type = 'project'
      AND entity_id = projects.id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY projects_insert_policy ON projects
  FOR INSERT
  WITH CHECK (owner_id = auth.uid() OR is_gm());

CREATE POLICY projects_update_policy ON projects
  FOR UPDATE
  USING (owner_id = auth.uid() OR is_gm())
  WITH CHECK (owner_id = auth.uid() OR is_gm());

CREATE POLICY projects_delete_policy ON projects
  FOR DELETE
  USING (owner_id = auth.uid() OR is_gm());

-- ============================================================================
-- ACHIEVEMENTS TABLE
-- ============================================================================

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY achievements_select_policy ON achievements
  FOR SELECT
  USING (
    owner_id = auth.uid() OR
    is_gm() OR
    EXISTS (
      SELECT 1 FROM document_access
      WHERE entity_type = 'achievement'
      AND entity_id = achievements.id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY achievements_insert_policy ON achievements
  FOR INSERT
  WITH CHECK (owner_id = auth.uid() OR is_gm());

CREATE POLICY achievements_update_policy ON achievements
  FOR UPDATE
  USING (owner_id = auth.uid() OR is_gm())
  WITH CHECK (owner_id = auth.uid() OR is_gm());

CREATE POLICY achievements_delete_policy ON achievements
  FOR DELETE
  USING (owner_id = auth.uid() OR is_gm());

-- ============================================================================
-- INVENTORY TABLE
-- ============================================================================

ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY inventory_select_policy ON inventory
  FOR SELECT
  USING (
    owner_id = auth.uid() OR
    is_gm() OR
    EXISTS (
      SELECT 1 FROM document_access
      WHERE entity_type = 'inventory'
      AND entity_id = inventory.id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY inventory_insert_policy ON inventory
  FOR INSERT
  WITH CHECK (owner_id = auth.uid() OR is_gm());

CREATE POLICY inventory_update_policy ON inventory
  FOR UPDATE
  USING (owner_id = auth.uid() OR is_gm())
  WITH CHECK (owner_id = auth.uid() OR is_gm());

CREATE POLICY inventory_delete_policy ON inventory
  FOR DELETE
  USING (owner_id = auth.uid() OR is_gm());

-- ============================================================================
-- NOTES TABLE
-- ============================================================================

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY notes_select_policy ON notes
  FOR SELECT
  USING (
    owner_id = auth.uid() OR
    is_gm() OR
    EXISTS (
      SELECT 1 FROM document_access
      WHERE entity_type = 'note'
      AND entity_id = notes.id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY notes_insert_policy ON notes
  FOR INSERT
  WITH CHECK (owner_id = auth.uid() OR is_gm());

CREATE POLICY notes_update_policy ON notes
  FOR UPDATE
  USING (owner_id = auth.uid() OR is_gm())
  WITH CHECK (owner_id = auth.uid() OR is_gm());

CREATE POLICY notes_delete_policy ON notes
  FOR DELETE
  USING (owner_id = auth.uid() OR is_gm());

-- ============================================================================
-- ROLLS TABLE
-- ============================================================================

ALTER TABLE rolls ENABLE ROW LEVEL SECURITY;

CREATE POLICY rolls_select_policy ON rolls
  FOR SELECT
  USING (
    owner_id = auth.uid() OR
    is_gm() OR
    EXISTS (
      SELECT 1 FROM document_access
      WHERE entity_type = 'roll'
      AND entity_id = rolls.id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY rolls_insert_policy ON rolls
  FOR INSERT
  WITH CHECK (owner_id = auth.uid() OR is_gm());

CREATE POLICY rolls_update_policy ON rolls
  FOR UPDATE
  USING (owner_id = auth.uid() OR is_gm())
  WITH CHECK (owner_id = auth.uid() OR is_gm());

CREATE POLICY rolls_delete_policy ON rolls
  FOR DELETE
  USING (owner_id = auth.uid() OR is_gm());

-- ============================================================================
-- FLOWS TABLE
-- ============================================================================

ALTER TABLE flows ENABLE ROW LEVEL SECURITY;

CREATE POLICY flows_select_policy ON flows
  FOR SELECT
  USING (
    owner_id = auth.uid() OR
    is_gm() OR
    EXISTS (
      SELECT 1 FROM document_access
      WHERE entity_type = 'flow'
      AND entity_id = flows.id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY flows_insert_policy ON flows
  FOR INSERT
  WITH CHECK (owner_id = auth.uid() OR is_gm());

CREATE POLICY flows_update_policy ON flows
  FOR UPDATE
  USING (owner_id = auth.uid() OR is_gm())
  WITH CHECK (owner_id = auth.uid() OR is_gm());

CREATE POLICY flows_delete_policy ON flows
  FOR DELETE
  USING (owner_id = auth.uid() OR is_gm());

-- ============================================================================
-- TIMELINES TABLE
-- ============================================================================

ALTER TABLE timelines ENABLE ROW LEVEL SECURITY;

CREATE POLICY timelines_select_policy ON timelines
  FOR SELECT
  USING (
    owner_id = auth.uid() OR
    is_gm() OR
    EXISTS (
      SELECT 1 FROM document_access
      WHERE entity_type = 'timeline'
      AND entity_id = timelines.id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY timelines_insert_policy ON timelines
  FOR INSERT
  WITH CHECK (owner_id = auth.uid() OR is_gm());

CREATE POLICY timelines_update_policy ON timelines
  FOR UPDATE
  USING (owner_id = auth.uid() OR is_gm())
  WITH CHECK (owner_id = auth.uid() OR is_gm());

CREATE POLICY timelines_delete_policy ON timelines
  FOR DELETE
  USING (owner_id = auth.uid() OR is_gm());

-- ============================================================================
-- CAMPAIGN TABLE (singleton, GM-only)
-- ============================================================================

ALTER TABLE campaign ENABLE ROW LEVEL SECURITY;

CREATE POLICY campaign_select_policy ON campaign
  FOR SELECT
  USING (true); -- Everyone can read campaign

CREATE POLICY campaign_insert_policy ON campaign
  FOR INSERT
  WITH CHECK (is_gm());

CREATE POLICY campaign_update_policy ON campaign
  FOR UPDATE
  USING (is_gm())
  WITH CHECK (is_gm());

CREATE POLICY campaign_delete_policy ON campaign
  FOR DELETE
  USING (is_gm());

-- ============================================================================
-- COMBAT SESSIONS TABLE (GM-only)
-- ============================================================================

ALTER TABLE combat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY combat_sessions_select_policy ON combat_sessions
  FOR SELECT
  USING (true); -- Everyone can read combat sessions

CREATE POLICY combat_sessions_insert_policy ON combat_sessions
  FOR INSERT
  WITH CHECK (is_gm());

CREATE POLICY combat_sessions_update_policy ON combat_sessions
  FOR UPDATE
  USING (is_gm())
  WITH CHECK (is_gm());

CREATE POLICY combat_sessions_delete_policy ON combat_sessions
  FOR DELETE
  USING (is_gm());

-- ============================================================================
-- RULES TABLE (static are read-only, custom can be added by GMs)
-- ============================================================================

ALTER TABLE rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY rules_select_policy ON rules
  FOR SELECT
  USING (true); -- Everyone can read rules

CREATE POLICY rules_insert_policy ON rules
  FOR INSERT
  WITH CHECK (is_gm() AND is_custom = true);

CREATE POLICY rules_update_policy ON rules
  FOR UPDATE
  USING (is_gm() AND is_custom = true)
  WITH CHECK (is_gm() AND is_custom = true);

CREATE POLICY rules_delete_policy ON rules
  FOR DELETE
  USING (is_gm() AND is_custom = true);

-- ============================================================================
-- RULES CONFIG TABLES (read-only for all, GM-only for writes)
-- ============================================================================

ALTER TABLE allowed_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE hit_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE combat_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE rules_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY allowed_attributes_select_policy ON allowed_attributes FOR SELECT USING (true);
CREATE POLICY hit_locations_select_policy ON hit_locations FOR SELECT USING (true);
CREATE POLICY combat_states_select_policy ON combat_states FOR SELECT USING (true);
CREATE POLICY rules_config_select_policy ON rules_config FOR SELECT USING (true);

-- ============================================================================
-- JUNCTION TABLES (inherit access from parent entity)
-- ============================================================================

-- Person junction tables: access if you can access the person
ALTER TABLE person_advantages ENABLE ROW LEVEL SECURITY;
ALTER TABLE person_disadvantages ENABLE ROW LEVEL SECURITY;
ALTER TABLE person_feats ENABLE ROW LEVEL SECURITY;
ALTER TABLE person_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE person_spells ENABLE ROW LEVEL SECURITY;
ALTER TABLE person_cantrips ENABLE ROW LEVEL SECURITY;
ALTER TABLE person_liturgies ENABLE ROW LEVEL SECURITY;
ALTER TABLE person_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE person_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE person_relationships ENABLE ROW LEVEL SECURITY;

-- Generic policy for person junction tables
CREATE POLICY person_advantages_select_policy ON person_advantages
  FOR SELECT USING (EXISTS (SELECT 1 FROM people WHERE id = person_id AND (owner_id = auth.uid() OR is_gm() OR EXISTS (SELECT 1 FROM document_access WHERE entity_type = 'person' AND entity_id = person_id AND user_id = auth.uid()))));
CREATE POLICY person_advantages_insert_policy ON person_advantages
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM people WHERE id = person_id AND (owner_id = auth.uid() OR is_gm())));
CREATE POLICY person_advantages_update_policy ON person_advantages
  FOR UPDATE USING (EXISTS (SELECT 1 FROM people WHERE id = person_id AND (owner_id = auth.uid() OR is_gm())));
CREATE POLICY person_advantages_delete_policy ON person_advantages
  FOR DELETE USING (EXISTS (SELECT 1 FROM people WHERE id = person_id AND (owner_id = auth.uid() OR is_gm())));

CREATE POLICY person_disadvantages_select_policy ON person_disadvantages
  FOR SELECT USING (EXISTS (SELECT 1 FROM people WHERE id = person_id AND (owner_id = auth.uid() OR is_gm() OR EXISTS (SELECT 1 FROM document_access WHERE entity_type = 'person' AND entity_id = person_id AND user_id = auth.uid()))));
CREATE POLICY person_disadvantages_insert_policy ON person_disadvantages
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM people WHERE id = person_id AND (owner_id = auth.uid() OR is_gm())));
CREATE POLICY person_disadvantages_update_policy ON person_disadvantages
  FOR UPDATE USING (EXISTS (SELECT 1 FROM people WHERE id = person_id AND (owner_id = auth.uid() OR is_gm())));
CREATE POLICY person_disadvantages_delete_policy ON person_disadvantages
  FOR DELETE USING (EXISTS (SELECT 1 FROM people WHERE id = person_id AND (owner_id = auth.uid() OR is_gm())));

CREATE POLICY person_feats_select_policy ON person_feats
  FOR SELECT USING (EXISTS (SELECT 1 FROM people WHERE id = person_id AND (owner_id = auth.uid() OR is_gm() OR EXISTS (SELECT 1 FROM document_access WHERE entity_type = 'person' AND entity_id = person_id AND user_id = auth.uid()))));
CREATE POLICY person_feats_insert_policy ON person_feats
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM people WHERE id = person_id AND (owner_id = auth.uid() OR is_gm())));
CREATE POLICY person_feats_update_policy ON person_feats
  FOR UPDATE USING (EXISTS (SELECT 1 FROM people WHERE id = person_id AND (owner_id = auth.uid() OR is_gm())));
CREATE POLICY person_feats_delete_policy ON person_feats
  FOR DELETE USING (EXISTS (SELECT 1 FROM people WHERE id = person_id AND (owner_id = auth.uid() OR is_gm())));

CREATE POLICY person_skills_select_policy ON person_skills
  FOR SELECT USING (EXISTS (SELECT 1 FROM people WHERE id = person_id AND (owner_id = auth.uid() OR is_gm() OR EXISTS (SELECT 1 FROM document_access WHERE entity_type = 'person' AND entity_id = person_id AND user_id = auth.uid()))));
CREATE POLICY person_skills_insert_policy ON person_skills
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM people WHERE id = person_id AND (owner_id = auth.uid() OR is_gm())));
CREATE POLICY person_skills_update_policy ON person_skills
  FOR UPDATE USING (EXISTS (SELECT 1 FROM people WHERE id = person_id AND (owner_id = auth.uid() OR is_gm())));
CREATE POLICY person_skills_delete_policy ON person_skills
  FOR DELETE USING (EXISTS (SELECT 1 FROM people WHERE id = person_id AND (owner_id = auth.uid() OR is_gm())));

CREATE POLICY person_spells_select_policy ON person_spells
  FOR SELECT USING (EXISTS (SELECT 1 FROM people WHERE id = person_id AND (owner_id = auth.uid() OR is_gm() OR EXISTS (SELECT 1 FROM document_access WHERE entity_type = 'person' AND entity_id = person_id AND user_id = auth.uid()))));
CREATE POLICY person_spells_insert_policy ON person_spells
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM people WHERE id = person_id AND (owner_id = auth.uid() OR is_gm())));
CREATE POLICY person_spells_update_policy ON person_spells
  FOR UPDATE USING (EXISTS (SELECT 1 FROM people WHERE id = person_id AND (owner_id = auth.uid() OR is_gm())));
CREATE POLICY person_spells_delete_policy ON person_spells
  FOR DELETE USING (EXISTS (SELECT 1 FROM people WHERE id = person_id AND (owner_id = auth.uid() OR is_gm())));

CREATE POLICY person_cantrips_select_policy ON person_cantrips
  FOR SELECT USING (EXISTS (SELECT 1 FROM people WHERE id = person_id AND (owner_id = auth.uid() OR is_gm() OR EXISTS (SELECT 1 FROM document_access WHERE entity_type = 'person' AND entity_id = person_id AND user_id = auth.uid()))));
CREATE POLICY person_cantrips_insert_policy ON person_cantrips
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM people WHERE id = person_id AND (owner_id = auth.uid() OR is_gm())));
CREATE POLICY person_cantrips_update_policy ON person_cantrips
  FOR UPDATE USING (EXISTS (SELECT 1 FROM people WHERE id = person_id AND (owner_id = auth.uid() OR is_gm())));
CREATE POLICY person_cantrips_delete_policy ON person_cantrips
  FOR DELETE USING (EXISTS (SELECT 1 FROM people WHERE id = person_id AND (owner_id = auth.uid() OR is_gm())));

CREATE POLICY person_liturgies_select_policy ON person_liturgies
  FOR SELECT USING (EXISTS (SELECT 1 FROM people WHERE id = person_id AND (owner_id = auth.uid() OR is_gm() OR EXISTS (SELECT 1 FROM document_access WHERE entity_type = 'person' AND entity_id = person_id AND user_id = auth.uid()))));
CREATE POLICY person_liturgies_insert_policy ON person_liturgies
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM people WHERE id = person_id AND (owner_id = auth.uid() OR is_gm())));
CREATE POLICY person_liturgies_update_policy ON person_liturgies
  FOR UPDATE USING (EXISTS (SELECT 1 FROM people WHERE id = person_id AND (owner_id = auth.uid() OR is_gm())));
CREATE POLICY person_liturgies_delete_policy ON person_liturgies
  FOR DELETE USING (EXISTS (SELECT 1 FROM people WHERE id = person_id AND (owner_id = auth.uid() OR is_gm())));

CREATE POLICY person_attributes_select_policy ON person_attributes
  FOR SELECT USING (EXISTS (SELECT 1 FROM people WHERE id = person_id AND (owner_id = auth.uid() OR is_gm() OR EXISTS (SELECT 1 FROM document_access WHERE entity_type = 'person' AND entity_id = person_id AND user_id = auth.uid()))));
CREATE POLICY person_attributes_insert_policy ON person_attributes
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM people WHERE id = person_id AND (owner_id = auth.uid() OR is_gm())));
CREATE POLICY person_attributes_update_policy ON person_attributes
  FOR UPDATE USING (EXISTS (SELECT 1 FROM people WHERE id = person_id AND (owner_id = auth.uid() OR is_gm())));
CREATE POLICY person_attributes_delete_policy ON person_attributes
  FOR DELETE USING (EXISTS (SELECT 1 FROM people WHERE id = person_id AND (owner_id = auth.uid() OR is_gm())));

CREATE POLICY person_tags_select_policy ON person_tags
  FOR SELECT USING (EXISTS (SELECT 1 FROM people WHERE id = person_id AND (owner_id = auth.uid() OR is_gm() OR EXISTS (SELECT 1 FROM document_access WHERE entity_type = 'person' AND entity_id = person_id AND user_id = auth.uid()))));
CREATE POLICY person_tags_insert_policy ON person_tags
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM people WHERE id = person_id AND (owner_id = auth.uid() OR is_gm())));
CREATE POLICY person_tags_update_policy ON person_tags
  FOR UPDATE USING (EXISTS (SELECT 1 FROM people WHERE id = person_id AND (owner_id = auth.uid() OR is_gm())));
CREATE POLICY person_tags_delete_policy ON person_tags
  FOR DELETE USING (EXISTS (SELECT 1 FROM people WHERE id = person_id AND (owner_id = auth.uid() OR is_gm())));

CREATE POLICY person_relationships_select_policy ON person_relationships
  FOR SELECT USING (EXISTS (SELECT 1 FROM people WHERE id = person_id AND (owner_id = auth.uid() OR is_gm() OR EXISTS (SELECT 1 FROM document_access WHERE entity_type = 'person' AND entity_id = person_id AND user_id = auth.uid()))));
CREATE POLICY person_relationships_insert_policy ON person_relationships
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM people WHERE id = person_id AND (owner_id = auth.uid() OR is_gm())));
CREATE POLICY person_relationships_update_policy ON person_relationships
  FOR UPDATE USING (EXISTS (SELECT 1 FROM people WHERE id = person_id AND (owner_id = auth.uid() OR is_gm())));
CREATE POLICY person_relationships_delete_policy ON person_relationships
  FOR DELETE USING (EXISTS (SELECT 1 FROM people WHERE id = person_id AND (owner_id = auth.uid() OR is_gm())));

-- Project junction tables
ALTER TABLE project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_milestones_select_policy ON project_milestones
  FOR SELECT USING (EXISTS (SELECT 1 FROM projects WHERE id = project_id AND (owner_id = auth.uid() OR is_gm() OR EXISTS (SELECT 1 FROM document_access WHERE entity_type = 'project' AND entity_id = project_id AND user_id = auth.uid()))));
CREATE POLICY project_milestones_insert_policy ON project_milestones
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM projects WHERE id = project_id AND (owner_id = auth.uid() OR is_gm())));
CREATE POLICY project_milestones_update_policy ON project_milestones
  FOR UPDATE USING (EXISTS (SELECT 1 FROM projects WHERE id = project_id AND (owner_id = auth.uid() OR is_gm())));
CREATE POLICY project_milestones_delete_policy ON project_milestones
  FOR DELETE USING (EXISTS (SELECT 1 FROM projects WHERE id = project_id AND (owner_id = auth.uid() OR is_gm())));

CREATE POLICY project_requirements_select_policy ON project_requirements
  FOR SELECT USING (EXISTS (SELECT 1 FROM projects WHERE id = project_id AND (owner_id = auth.uid() OR is_gm() OR EXISTS (SELECT 1 FROM document_access WHERE entity_type = 'project' AND entity_id = project_id AND user_id = auth.uid()))));
CREATE POLICY project_requirements_insert_policy ON project_requirements
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM projects WHERE id = project_id AND (owner_id = auth.uid() OR is_gm())));
CREATE POLICY project_requirements_update_policy ON project_requirements
  FOR UPDATE USING (EXISTS (SELECT 1 FROM projects WHERE id = project_id AND (owner_id = auth.uid() OR is_gm())));
CREATE POLICY project_requirements_delete_policy ON project_requirements
  FOR DELETE USING (EXISTS (SELECT 1 FROM projects WHERE id = project_id AND (owner_id = auth.uid() OR is_gm())));

-- Achievement junction tables
ALTER TABLE achievement_people ENABLE ROW LEVEL SECURITY;

CREATE POLICY achievement_people_select_policy ON achievement_people
  FOR SELECT USING (EXISTS (SELECT 1 FROM achievements WHERE id = achievement_id AND (owner_id = auth.uid() OR is_gm() OR EXISTS (SELECT 1 FROM document_access WHERE entity_type = 'achievement' AND entity_id = achievement_id AND user_id = auth.uid()))));
CREATE POLICY achievement_people_insert_policy ON achievement_people
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM achievements WHERE id = achievement_id AND (owner_id = auth.uid() OR is_gm())));
CREATE POLICY achievement_people_update_policy ON achievement_people
  FOR UPDATE USING (EXISTS (SELECT 1 FROM achievements WHERE id = achievement_id AND (owner_id = auth.uid() OR is_gm())));
CREATE POLICY achievement_people_delete_policy ON achievement_people
  FOR DELETE USING (EXISTS (SELECT 1 FROM achievements WHERE id = achievement_id AND (owner_id = auth.uid() OR is_gm())));

-- Flow items
ALTER TABLE flow_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY flow_items_select_policy ON flow_items
  FOR SELECT USING (EXISTS (SELECT 1 FROM flows WHERE id = flow_id AND (owner_id = auth.uid() OR is_gm() OR EXISTS (SELECT 1 FROM document_access WHERE entity_type = 'flow' AND entity_id = flow_id AND user_id = auth.uid()))));
CREATE POLICY flow_items_insert_policy ON flow_items
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM flows WHERE id = flow_id AND (owner_id = auth.uid() OR is_gm())));
CREATE POLICY flow_items_update_policy ON flow_items
  FOR UPDATE USING (EXISTS (SELECT 1 FROM flows WHERE id = flow_id AND (owner_id = auth.uid() OR is_gm())));
CREATE POLICY flow_items_delete_policy ON flow_items
  FOR DELETE USING (EXISTS (SELECT 1 FROM flows WHERE id = flow_id AND (owner_id = auth.uid() OR is_gm())));

-- Historic events
ALTER TABLE historic_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY historic_events_select_policy ON historic_events
  FOR SELECT USING (EXISTS (SELECT 1 FROM timelines WHERE id = timeline_id AND (owner_id = auth.uid() OR is_gm() OR EXISTS (SELECT 1 FROM document_access WHERE entity_type = 'timeline' AND entity_id = timeline_id AND user_id = auth.uid()))));
CREATE POLICY historic_events_insert_policy ON historic_events
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM timelines WHERE id = timeline_id AND (owner_id = auth.uid() OR is_gm())));
CREATE POLICY historic_events_update_policy ON historic_events
  FOR UPDATE USING (EXISTS (SELECT 1 FROM timelines WHERE id = timeline_id AND (owner_id = auth.uid() OR is_gm())));
CREATE POLICY historic_events_delete_policy ON historic_events
  FOR DELETE USING (EXISTS (SELECT 1 FROM timelines WHERE id = timeline_id AND (owner_id = auth.uid() OR is_gm())));

-- Info boxes (polymorphic access)
ALTER TABLE info_boxes ENABLE ROW LEVEL SECURITY;

CREATE POLICY info_boxes_select_policy ON info_boxes
  FOR SELECT USING (
    owner_id = auth.uid() OR
    is_gm() OR
    (entity_type = 'person' AND EXISTS (SELECT 1 FROM people WHERE id = entity_id AND (owner_id = auth.uid() OR EXISTS (SELECT 1 FROM document_access WHERE entity_type = 'person' AND entity_id = info_boxes.entity_id AND user_id = auth.uid())))) OR
    (entity_type = 'place' AND EXISTS (SELECT 1 FROM places WHERE id = entity_id AND (owner_id = auth.uid() OR EXISTS (SELECT 1 FROM document_access WHERE entity_type = 'place' AND entity_id = info_boxes.entity_id AND user_id = auth.uid())))) OR
    (entity_type = 'quest' AND EXISTS (SELECT 1 FROM quests WHERE id = entity_id AND (owner_id = auth.uid() OR EXISTS (SELECT 1 FROM document_access WHERE entity_type = 'quest' AND entity_id = info_boxes.entity_id AND user_id = auth.uid()))))
  );

CREATE POLICY info_boxes_insert_policy ON info_boxes
  FOR INSERT WITH CHECK (owner_id = auth.uid() OR is_gm());

CREATE POLICY info_boxes_update_policy ON info_boxes
  FOR UPDATE USING (owner_id = auth.uid() OR is_gm())
  WITH CHECK (owner_id = auth.uid() OR is_gm());

CREATE POLICY info_boxes_delete_policy ON info_boxes
  FOR DELETE USING (owner_id = auth.uid() OR is_gm());

-- Combatants (inherit from combat session - GM only for writes, public read)
ALTER TABLE combatants ENABLE ROW LEVEL SECURITY;

CREATE POLICY combatants_select_policy ON combatants
  FOR SELECT USING (true);

CREATE POLICY combatants_insert_policy ON combatants
  FOR INSERT WITH CHECK (is_gm());

CREATE POLICY combatants_update_policy ON combatants
  FOR UPDATE USING (is_gm())
  WITH CHECK (is_gm());

CREATE POLICY combatants_delete_policy ON combatants
  FOR DELETE USING (is_gm());

-- Combatant attributes
ALTER TABLE combatant_attributes ENABLE ROW LEVEL SECURITY;

CREATE POLICY combatant_attributes_select_policy ON combatant_attributes
  FOR SELECT USING (true);

CREATE POLICY combatant_attributes_insert_policy ON combatant_attributes
  FOR INSERT WITH CHECK (is_gm());

CREATE POLICY combatant_attributes_update_policy ON combatant_attributes
  FOR UPDATE USING (is_gm())
  WITH CHECK (is_gm());

CREATE POLICY combatant_attributes_delete_policy ON combatant_attributes
  FOR DELETE USING (is_gm());

-- Combatant states
ALTER TABLE combatant_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY combatant_states_select_policy ON combatant_states
  FOR SELECT USING (true);

CREATE POLICY combatant_states_insert_policy ON combatant_states
  FOR INSERT WITH CHECK (is_gm());

CREATE POLICY combatant_states_update_policy ON combatant_states
  FOR UPDATE USING (is_gm())
  WITH CHECK (is_gm());

CREATE POLICY combatant_states_delete_policy ON combatant_states
  FOR DELETE USING (is_gm());
