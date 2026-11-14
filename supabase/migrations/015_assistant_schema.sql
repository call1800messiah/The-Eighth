-- ============================================================================
-- 015: The schema as Claude (the assistant role, migration 013) sees it
-- ============================================================================
--
-- The MCP server's `describe` tool lists what Claude can read and what it
-- means. PostgREST's own OpenAPI document would do the first half, but the
-- gateway serves it only with the service-role key (Supabase's Envoy route
-- `rest-v1-openapi-protected`), so the schema comes from this function
-- instead, called with the assistant's own session.
--
-- assistant_schema() lists the tables in `public` that have a permissive
-- SELECT policy for the assistant, so a table added later without one does
-- not show up as readable. The MCP server's own OAuth tables (mcp_*) are
-- never listed. The comments below are what `describe` shows as meanings;
-- a new table should get one too.
--
-- One transaction: applied by hand on production, it either goes in whole or
-- not at all, so a failure can simply be fixed and the file run again.

BEGIN;

CREATE FUNCTION public.assistant_schema() RETURNS JSONB
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
  SELECT COALESCE(jsonb_agg(t.tbl ORDER BY t.tbl->>'name'), '[]'::JSONB)
  FROM (
    SELECT jsonb_build_object(
      'name', c.relname,
      'note', obj_description(c.oid, 'pg_class'),
      'columns', (
        SELECT jsonb_agg(jsonb_build_object(
          'name', a.attname,
          'type', format_type(a.atttypid, a.atttypmod),
          'nullable', NOT a.attnotnull,
          'references', (
            SELECT rc.relname || '.' || ra.attname
            FROM pg_constraint k
            JOIN pg_class rc ON rc.oid = k.confrelid
            JOIN pg_attribute ra ON ra.attrelid = k.confrelid AND ra.attnum = k.confkey[1]
            WHERE k.conrelid = c.oid AND k.contype = 'f' AND k.conkey = ARRAY[a.attnum]
            LIMIT 1),
          'values', (
            SELECT jsonb_agg(e.enumlabel ORDER BY e.enumsortorder)
            FROM pg_enum e WHERE e.enumtypid = a.atttypid),
          'note', col_description(c.oid, a.attnum)
        ) ORDER BY a.attnum)
        FROM pg_attribute a
        WHERE a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped)
    ) AS tbl
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relrowsecurity
      AND c.relname NOT LIKE 'mcp\_%'
      AND EXISTS (
        SELECT 1 FROM pg_policies p
        WHERE p.schemaname = 'public' AND p.tablename = c.relname
          AND p.permissive = 'PERMISSIVE' AND p.cmd IN ('SELECT', 'ALL')
          AND p.qual LIKE '%is_assistant()%')
  ) t;
$$;

REVOKE ALL ON FUNCTION public.assistant_schema() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assistant_schema() TO authenticated;

-- ── Users and access ────────────────────────────────────────────────────────
COMMENT ON TABLE users IS 'Players and GMs of the campaign (name only). view_* are their display preferences.';
COMMENT ON TABLE user_roles IS 'Roles of users: gm, co_gm, player, observer, assistant (Claude).';
COMMENT ON TABLE document_access IS 'Explicit sharing of one entity (entity_type + entity_id) with one user. Owners and GMs see everything without a row here.';

-- ── Rules ───────────────────────────────────────────────────────────────────
COMMENT ON TABLE rules IS 'Regeln: every advantage (Vorteil), disadvantage (Nachteil), feat (Sonderfertigkeit), skill (Talent), spell (Zauber), cantrip (Zaubertrick) and liturgy (Liturgie). People reference them by id in the person_<category> tables.';
COMMENT ON COLUMN rules.category IS 'Which kind of rule; decides the person_* table that references it.';
COMMENT ON COLUMN rules.metadata IS 'Category-specific fields, e.g. cost, attributes / attributeOne..Three (test attributes), castingTime, range, duration, requirements, hasLevels.';
COMMENT ON COLUMN rules.is_static IS 'Seeded from the rules file of the game system.';
COMMENT ON COLUMN rules.is_custom IS 'Made up for this campaign (Hausregel).';
COMMENT ON TABLE rules_config IS 'Per game system: edition and the field definitions of each rule category.';
COMMENT ON TABLE allowed_attributes IS 'Attributes a person can have (Eigenschaften and Energien such as LeP, AsP), with short_code as used in person_attributes.type.';
COMMENT ON TABLE hit_locations IS 'Trefferzonen: d20 roll -> body part.';
COMMENT ON TABLE combat_states IS 'States a combatant can be in (Zustände/Status such as Liegend, Bewusstlos).';

-- ── People ──────────────────────────────────────────────────────────────────
COMMENT ON TABLE people IS 'Personen: player characters (pc = true) and NPCs.';
COMMENT ON COLUMN people.status IS 'draft: made by Claude, visible only to GMs and Claude until a GM publishes it.';
COMMENT ON COLUMN people.location_id IS 'Where the person can usually be found.';
COMMENT ON COLUMN people.xp IS 'Abenteuerpunkte earned; xp_spent is what has been spent.';
COMMENT ON COLUMN people.image IS 'Storage path of the portrait.';
COMMENT ON TABLE person_tags IS 'Free-form tags on a person (e.g. magiebegabt, adlig).';
COMMENT ON TABLE person_attributes IS 'A person''s attributes and energies: type is a short code from allowed_attributes (e.g. lep, asp, mu), with current and max value.';
COMMENT ON TABLE person_relationships IS 'Family and other ties between two people; relationship_type is parents, children, siblings, partners, ... seen from person_id.';
COMMENT ON TABLE person_advantages IS 'A person''s advantages (Vorteile); rule_id -> rules (name, category). level and details as the rule needs them.';
COMMENT ON TABLE person_disadvantages IS 'A person''s disadvantages (Nachteile); rule_id -> rules (name, category). level and details as the rule needs them.';
COMMENT ON TABLE person_feats IS 'A person''s feats (Sonderfertigkeiten); rule_id -> rules (name, category). level and details as the rule needs them.';
COMMENT ON TABLE person_skills IS 'A person''s skills (Talente); rule_id -> rules (name, category), value = Talentwert.';
COMMENT ON TABLE person_spells IS 'A person''s spells (Zauber); rule_id -> rules (name, category), value = Zauberfertigkeitswert.';
COMMENT ON TABLE person_cantrips IS 'A person''s cantrips (Zaubertricks); rule_id -> rules (name, category).';
COMMENT ON TABLE person_liturgies IS 'A person''s liturgies (Liturgien); rule_id -> rules (name, category). The app''s field is called liturgys.';

-- ── Places, quests, texts ───────────────────────────────────────────────────
COMMENT ON TABLE places IS 'Orte: regions, cities, buildings, ships ... nested through parent_id.';
COMMENT ON COLUMN places.status IS 'draft: made by Claude, visible only to GMs and Claude until a GM publishes it.';
COMMENT ON COLUMN places.parent_id IS 'The place this one lies in.';
COMMENT ON TABLE quests IS 'Quests, nested through parent_id (main quest -> subquests, scenes, tasks).';
COMMENT ON COLUMN quests.status IS 'draft: made by Claude, visible only to GMs and Claude until a GM publishes it.';
COMMENT ON COLUMN quests.parent_id IS 'The larger quest this one is part of.';
COMMENT ON TABLE info_boxes IS 'Text sections (Markdown) of a person, place or quest page, found by entity_type + entity_id.';
COMMENT ON COLUMN info_boxes.type IS 'Section: appearance (Erscheinungsbild), background (Hintergrund), character (Charakter), goals (Ziele), reward (Belohnung), note (Notizen).';
COMMENT ON COLUMN info_boxes.entity_type IS 'person, place or quest.';
COMMENT ON TABLE notes IS 'Notizen: free Markdown notes with a title and category.';
COMMENT ON TABLE mentions IS 'Backlinks: which text (source_type, source_id, field) mentions which entity (entity_type, entity_id). Maintained by triggers.';

-- ── Campaign and history ────────────────────────────────────────────────────
COMMENT ON TABLE campaign IS 'The campaign itself: name, current in-game date, ship and crew, the group''s xp, its timeline.';
COMMENT ON TABLE timelines IS 'Zeitleisten; their entries are historic_events.';
COMMENT ON TABLE historic_events IS 'Entries of a timeline: date (in-game, as text), type and Markdown content.';
COMMENT ON TABLE achievements IS 'Errungenschaften the group unlocked, with the people involved in achievement_people.';
COMMENT ON TABLE achievement_people IS 'Which people took part in an achievement.';
COMMENT ON TABLE projects IS 'Long-running projects (e.g. crafting, research) with milestones and skill requirements.';
COMMENT ON TABLE project_milestones IS 'Milestones of a project, reached at required_points.';
COMMENT ON TABLE project_requirements IS 'Skill checks a project needs: skill name, points so far and needed, threshold.';
COMMENT ON TABLE inventory IS 'Inventar: items with amount; character is the carrier''s name as text, not a reference.';
COMMENT ON TABLE rolls IS 'Dice roll log: attribute, skill and damage rolls with their results.';

-- ── Sessions ────────────────────────────────────────────────────────────────
COMMENT ON TABLE flows IS 'Spielabende (Flow): one per game session, dated; its items are in flow_items.';
COMMENT ON TABLE flow_items IS 'The people, places, quests and notes on a session''s flow, in sort_order; entity_id points into the table named by type.';
COMMENT ON TABLE beat_sessions IS 'Story beat tracker of one flow (GM spotlight timer): when it ran and was paused.';
COMMENT ON TABLE story_beats IS 'One spotlight moment of a person in a beat session: kind and the session time it happened at.';
COMMENT ON TABLE scenes IS 'Scene images shown to the players, with caption; the people in them are in scene_people.';
COMMENT ON TABLE scene_people IS 'Which people appear in a scene image.';

-- ── Combat ──────────────────────────────────────────────────────────────────
COMMENT ON TABLE combat_sessions IS 'Kämpfe: one per fight; is_active marks the running one.';
COMMENT ON TABLE combatants IS 'Participants of a fight: a person (person_id) or a generic enemy (name), with initiative.';
COMMENT ON TABLE combatant_attributes IS 'Attributes of a combatant during the fight (e.g. lep current/max).';
COMMENT ON TABLE combatant_states IS 'States a combatant is in.';
COMMENT ON COLUMN combatant_states.state IS 'The state''s name, as in combat_states.name (the app calls it name).';
COMMENT ON TABLE combat_maps IS 'Battle map of a fight: image, size and grid.';
COMMENT ON TABLE combat_tokens IS 'Where a combatant stands on the battle map, in map pixels.';

COMMIT;
