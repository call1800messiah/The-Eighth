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
-- A few free-text columns whose values the GM makes up (tags, note
-- categories, ...) also list the values that occur, with counts, as
-- `occurring`: PostgREST has no DISTINCT, so without them Claude would page
-- through rows just to learn what to filter on. Like everything else here
-- they are read with the caller's own rights (SECURITY INVOKER), so RLS
-- decides which rows they count. Columns with a fixed value set name it in
-- their comment instead.
--
-- One transaction: applied by hand on production, it either goes in whole or
-- not at all, so a failure can simply be fixed and the file run again.

BEGIN;

CREATE FUNCTION public.assistant_schema() RETURNS JSONB
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
  WITH counted(tbl, col, value, n) AS (
              SELECT 'person_tags', 'tag', tag, count(*) FROM person_tags GROUP BY tag
    UNION ALL SELECT 'notes', 'category', category, count(*) FROM notes GROUP BY category
    UNION ALL SELECT 'people', 'race', race, count(*) FROM people GROUP BY race
    UNION ALL SELECT 'people', 'culture', culture, count(*) FROM people GROUP BY culture
    UNION ALL SELECT 'people', 'profession', profession, count(*) FROM people GROUP BY profession
    UNION ALL SELECT 'inventory', 'character', character, count(*) FROM inventory GROUP BY character
  ),
  ranked AS (
    SELECT *, row_number() OVER (PARTITION BY tbl, col ORDER BY n DESC, value) AS rank
    FROM counted WHERE value IS NOT NULL AND value <> ''
  ),
  occurring(tbl, col, vals) AS (
    SELECT tbl, col, jsonb_agg(jsonb_build_object('value', value, 'count', n) ORDER BY rank)
    FROM ranked WHERE rank <= 200
    GROUP BY tbl, col
  )
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
          'occurring', (
            SELECT o.vals FROM occurring o WHERE o.tbl = c.relname AND o.col = a.attname),
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
COMMENT ON TABLE users IS 'Players and GMs of the campaign (name only). view_* are their display preferences. owner_id in other tables points here: who created the row, and for a player character the player.';
COMMENT ON COLUMN users.firebase_uid IS 'Left over from the move off Firebase; ignore.';
COMMENT ON TABLE user_roles IS 'Roles of users: gm, co_gm, player, observer, assistant (Claude).';
COMMENT ON TABLE document_access IS 'Explicit sharing of one entity (entity_type + entity_id) with one user. Owners and GMs see everything without a row here.';
COMMENT ON COLUMN document_access.entity_type IS 'person, place, quest, flow, ...: the table the entity_id is in (people, places, quests, flows, ...).';

-- ── Rules ───────────────────────────────────────────────────────────────────
COMMENT ON TABLE rules IS 'Regeln: every advantage (Vorteil), disadvantage (Nachteil), feat (Sonderfertigkeit), skill (Talent), spell (Zauber), cantrip (Zaubertrick) and liturgy (Liturgie). People reference them by id in the person_<category> tables.';
COMMENT ON COLUMN rules.category IS 'Which kind of rule; decides the person_* table that references it.';
COMMENT ON COLUMN rules.metadata IS 'Category-specific fields, e.g. cost, attributes / attributeOne..Three (test attributes), castingTime, range, duration, requirements, hasLevels.';
COMMENT ON COLUMN rules.is_static IS 'Seeded from the rules file of the game system.';
COMMENT ON COLUMN rules.is_custom IS 'Made up for this campaign (Hausregel).';
COMMENT ON COLUMN rules.description IS 'The rule text (Markdown).';
COMMENT ON TABLE rules_config IS 'Per game system: edition and the field definitions of each rule category.';
COMMENT ON COLUMN rules_config.tenant IS 'The game system (tde5 = Das Schwarze Auge 5, the-eighth = own system); the app uses only the row of its own system.';
COMMENT ON TABLE allowed_attributes IS 'Attributes a person can have (Eigenschaften and Energien such as LeP, AsP), with short_code as used in person_attributes.type.';
COMMENT ON COLUMN allowed_attributes.tenant IS 'The game system; the app uses only the rows of its own system.';
COMMENT ON COLUMN allowed_attributes.display_style IS 'number (an Eigenschaft such as MU) or bar (an energy with current/max such as LeP).';
COMMENT ON COLUMN allowed_attributes.roll_type IS 'attribute if it can be rolled against, otherwise null.';
COMMENT ON TABLE hit_locations IS 'Trefferzonen: d20 roll -> body part.';
COMMENT ON TABLE combat_states IS 'States a combatant can be in (Zustände/Status such as Liegend, Bewusstlos).';

-- ── People ──────────────────────────────────────────────────────────────────
COMMENT ON TABLE people IS 'Personen: player characters (pc = true) and NPCs. Their texts (appearance, background, ...) are in info_boxes, their tags, attributes, rules and relatives in the person_* tables.';
COMMENT ON COLUMN people.status IS 'draft: made by Claude, visible only to GMs and Claude until a GM publishes it.';
COMMENT ON COLUMN people.pc IS 'true for a player character (Spielercharakter), false for an NPC.';
COMMENT ON COLUMN people.owner_id IS 'Who created the person; for a player character, its player (users.id).';
COMMENT ON COLUMN people.title IS 'Epithet or rank shown with the name (e.g. Baron, die Weise).';
COMMENT ON COLUMN people.race IS 'Spezies, free text (German); see occurring for the values in use.';
COMMENT ON COLUMN people.culture IS 'Kultur, free text (German); see occurring for the values in use.';
COMMENT ON COLUMN people.profession IS 'Profession, free text (German); see occurring for the values in use.';
COMMENT ON COLUMN people.birthday IS 'Birthday as in-game date text (day and month).';
COMMENT ON COLUMN people.birthyear IS 'In-game year of birth; compare with campaign.date for the age.';
COMMENT ON COLUMN people.deathday IS 'In-game date of death as text; set means the person is dead.';
COMMENT ON COLUMN people.height IS 'Height in cm.';
COMMENT ON COLUMN people.location_id IS 'Where the person can usually be found.';
COMMENT ON COLUMN people.xp IS 'Abenteuerpunkte earned; xp_spent is what has been spent.';
COMMENT ON COLUMN people.image IS 'Storage path of the portrait.';
COMMENT ON COLUMN people.banner IS 'Storage path of the banner image.';
COMMENT ON TABLE person_tags IS 'Free-form tags on a person (e.g. magiebegabt, adlig). The tag column lists the tags in use with counts.';
COMMENT ON TABLE person_attributes IS 'A person''s attributes and energies: type is a short code from allowed_attributes (e.g. lep, asp, mu), with current and max value.';
COMMENT ON TABLE person_relationships IS 'Family ties between two people. A row reads: related_person_id is one of person_id''s <relationship_type>.';
COMMENT ON COLUMN person_relationships.relationship_type IS 'parents, children, siblings or partners (other relatives may use other words). A parents row means related_person_id is a parent of person_id. The opposite row (children) is not always stored, so look up both directions.';
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
COMMENT ON COLUMN places.type IS 'One of: barony, castle, city, forest, fortifiedYard, hamlet, island, landmass, ocean, place, principality, ship, shire, state, town.';
COMMENT ON COLUMN places.inhabitants IS 'Einwohner as free text (a number or a description), not a count to compute with.';
COMMENT ON COLUMN places.image IS 'Storage path of the image.';
COMMENT ON TABLE quests IS 'Quests, nested through parent_id (main quest -> subquests, scenes, tasks).';
COMMENT ON COLUMN quests.status IS 'draft: made by Claude, visible only to GMs and Claude until a GM publishes it.';
COMMENT ON COLUMN quests.parent_id IS 'The larger quest this one is part of.';
COMMENT ON COLUMN quests.type IS 'main (Hauptquest), sub (Nebenquest), scene (Szene) or task (Aufgabe).';
COMMENT ON COLUMN quests.completed IS 'true once the quest is done; false means still open.';
COMMENT ON COLUMN quests.description IS 'Short description (Markdown); longer texts (goals, reward, notes) are in info_boxes.';
COMMENT ON TABLE info_boxes IS 'Text sections (Markdown) of a person, place or quest page, found by entity_type + entity_id.';
COMMENT ON COLUMN info_boxes.type IS 'Section: appearance (Erscheinungsbild), background (Hintergrund), character (Charakter), goals (Ziele), reward (Belohnung), note (Notizen).';
COMMENT ON COLUMN info_boxes.entity_type IS 'person, place or quest.';
COMMENT ON TABLE notes IS 'Notizen: free Markdown notes with a title and category.';
COMMENT ON COLUMN notes.category IS 'Free text the GM groups notes by; occurring lists the categories in use.';
COMMENT ON TABLE mentions IS 'Backlinks: which text (source_type, source_id, field) mentions which entity (entity_type, entity_id). Maintained by triggers. The fastest way to find every text that mentions someone.';
COMMENT ON COLUMN mentions.source_type IS 'achievement, historic_event, info_box, note, quest or rule: the table of the mentioning text (achievements, historic_events, info_boxes, notes, quests, rules).';
COMMENT ON COLUMN mentions.field IS 'The column the mention is in; a dotted path points into a JSONB column (e.g. metadata.variants on rules).';
COMMENT ON COLUMN mentions.entity_type IS 'person, place, quest or note: the table of the mentioned entity (people, places, quests, notes).';

-- ── Campaign and history ────────────────────────────────────────────────────
COMMENT ON TABLE campaign IS 'The campaign itself (one row): name, current in-game date, ship and crew, the group''s xp, its timeline.';
COMMENT ON COLUMN campaign.date IS 'Current in-game date, as text: "today" in the campaign.';
COMMENT ON COLUMN campaign.ship_id IS 'The group''s ship (a place of type ship). Use this, not ship.';
COMMENT ON COLUMN campaign.ship IS 'Old ship name from before ship_id; ignore when ship_id is set.';
COMMENT ON COLUMN campaign.captain IS 'Name of the ship''s captain, as text.';
COMMENT ON COLUMN campaign.crewcount IS 'Size of the crew (Mannschaft).';
COMMENT ON COLUMN campaign.stamina_reduction IS 'Ausdauer-Malus currently in effect for the group.';
COMMENT ON COLUMN campaign.xp IS 'Abenteuerpunkte the group has earned so far.';
COMMENT ON COLUMN campaign.timeline_id IS 'The campaign''s main timeline.';
COMMENT ON TABLE timelines IS 'Zeitleisten; their entries are historic_events.';
COMMENT ON TABLE historic_events IS 'Entries of a timeline: date (in-game, as text), type and Markdown content.';
COMMENT ON COLUMN historic_events.date IS 'In-game date as text, as the GM wrote it; sort by it only loosely.';
COMMENT ON COLUMN historic_events.type IS 'Always 0 (standard) so far.';
COMMENT ON TABLE achievements IS 'Errungenschaften the group unlocked, with the people involved in achievement_people.';
COMMENT ON COLUMN achievements.unlocked IS 'Real-world time it was unlocked.';
COMMENT ON COLUMN achievements.icon IS 'Storage path of the icon.';
COMMENT ON TABLE achievement_people IS 'Which people took part in an achievement.';
COMMENT ON TABLE projects IS 'Long-running projects (e.g. crafting, research) with milestones and skill requirements.';
COMMENT ON COLUMN projects.benefit IS 'What the project gives once finished.';
COMMENT ON COLUMN projects.interval IS 'How often progress is checked, as free text the GM entered.';
COMMENT ON TABLE project_milestones IS 'Milestones of a project, reached at required_points.';
COMMENT ON TABLE project_requirements IS 'Skill checks a project needs: skill name, points so far and needed, threshold.';
COMMENT ON COLUMN project_requirements.skill IS 'Skill name as text (matches rules.name of a skill), not a reference.';
COMMENT ON COLUMN project_requirements.threshold IS 'Schwelle of the check, as the GM set it.';
COMMENT ON TABLE inventory IS 'Inventar: items with amount; character is the carrier''s name as text, not a reference.';
COMMENT ON COLUMN inventory.character IS 'Carrier''s name as free text (match people.name loosely); occurring lists the carriers in use.';
COMMENT ON TABLE rolls IS 'Dice roll log: attribute, skill and damage rolls with their results. owner_id is who rolled, created_at when.';
COMMENT ON COLUMN rolls.type IS 'attribute: attribute + roll; skill / skill5: attributes[3] + rolls[3] + skill_points; damage / dice: dice_rolls[] + dice_type. name is the skill or attribute.';

-- ── Sessions ────────────────────────────────────────────────────────────────
COMMENT ON TABLE flows IS 'Spielabende (Flow): one per game session, dated; its items are in flow_items.';
COMMENT ON TABLE flow_items IS 'The people, places, quests and notes on a session''s flow, in sort_order; entity_id points into the table named by type.';
COMMENT ON COLUMN flows.date IS 'Real-world date of the game session.';
COMMENT ON COLUMN flow_items.type IS 'person, place, quest or note: the table entity_id points into (people, places, quests, notes).';
COMMENT ON TABLE beat_sessions IS 'Story beat tracker of one flow (GM spotlight timer): when it ran and was paused.';
COMMENT ON COLUMN beat_sessions.muted_person_ids IS 'Player characters whose player was absent; they are not tracked.';
COMMENT ON TABLE story_beats IS 'One spotlight moment of a person in a beat session: kind and the session time it happened at.';
COMMENT ON COLUMN story_beats.kind IS 'combat, discovery, general, lore, skill or social; null if none was chosen.';
COMMENT ON COLUMN story_beats.active_seconds IS 'Session clock (stopped time excluded) when the beat was logged.';
COMMENT ON TABLE scenes IS 'Scene images shown to the players, with caption; the people in them are in scene_people.';
COMMENT ON TABLE scene_people IS 'Which people appear in a scene image.';

-- ── Combat ──────────────────────────────────────────────────────────────────
COMMENT ON TABLE combat_sessions IS 'Kämpfe: one per fight; is_active marks the running one.';
COMMENT ON TABLE combatants IS 'Participants of a fight: a person (person_id) or a generic enemy (name), with initiative.';
COMMENT ON COLUMN combatants.person_id IS 'The person fighting; null for a generic enemy, which has a name instead (exactly one of the two is set).';
COMMENT ON COLUMN combatants.active IS 'Aktiv: false while the combatant takes no turns (shown without initiative).';
COMMENT ON TABLE combatant_attributes IS 'Attributes of a combatant during the fight (e.g. lep current/max). Only generic enemies have rows here; for a person the values are in person_attributes.';
COMMENT ON COLUMN combatant_attributes.type IS 'Short code from allowed_attributes (e.g. lep, asp).';
COMMENT ON TABLE combatant_states IS 'States a combatant is in.';
COMMENT ON COLUMN combatant_states.state IS 'The state''s name, as in combat_states.name (the app calls it name).';
COMMENT ON TABLE combat_maps IS 'Battle map of a fight: image, size and grid.';
COMMENT ON TABLE combat_tokens IS 'Where a combatant stands on the battle map, in map pixels.';

COMMIT;
