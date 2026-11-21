-- Mentions: backlinks for the rich-text editor.
--
-- Every long text field in the app is Markdown. A mention is an ordinary
-- Markdown link with a `mention:` target:
--
--   [Alrik](mention:person/5f0c…-…)
--
-- The label is the target's name at the time of writing. The renderer shows
-- the current name instead when the viewer can see the target, and only the
-- stored label when they cannot.
--
-- This table is derived data: one row per (source field, mentioned entity).
-- The triggers below rebuild a source row's mentions whenever it is written,
-- so whoever writes the text (the app, the MCP server, a SQL console) cannot
-- leave the backlinks out of date. Clients never write here.
--
-- Existing texts predate the syntax and hold no mentions, so there is nothing
-- to backfill.

CREATE TABLE mentions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL
    CHECK (source_type IN ('achievement', 'historic_event', 'info_box', 'note', 'quest', 'rule')),
  source_id   UUID NOT NULL,
  -- Column the mention is in. A dotted path points into a JSONB column,
  -- e.g. `metadata.variants` on rules.
  field       TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('person', 'place', 'quest', 'note')),
  entity_id   UUID NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT mentions_unique UNIQUE (source_type, source_id, field, entity_type, entity_id)
);

-- Backlink lookups go by target.
CREATE INDEX idx_mentions_entity ON mentions(entity_type, entity_id);

-- DELETE payloads carry the whole row.
ALTER TABLE mentions REPLICA IDENTITY FULL;

-- ============================================================================
-- REBUILD ON WRITE
-- ============================================================================

-- Trigger arguments: the source type, then the field paths to scan.
--
-- SECURITY DEFINER because clients have no write access to mentions. It only
-- ever writes rows for the source row that fired it, so it grants nothing
-- beyond the write the caller was already allowed to make.
CREATE FUNCTION rebuild_mentions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_source_type TEXT := TG_ARGV[0];
  v_new JSONB;
  v_old JSONB;
  v_path TEXT[];
  v_changed BOOLEAN := FALSE;
  i INTEGER;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM mentions WHERE source_type = v_source_type AND source_id = OLD.id;
    RETURN NULL;
  END IF;

  v_new := to_jsonb(NEW);

  -- Leave the rows alone when no text field changed: a quest being ticked off
  -- should not churn its backlinks (and their realtime events).
  IF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD);
    FOR i IN 1 .. TG_NARGS - 1 LOOP
      v_path := string_to_array(TG_ARGV[i], '.');
      IF (v_new #>> v_path) IS DISTINCT FROM (v_old #>> v_path) THEN
        v_changed := TRUE;
      END IF;
    END LOOP;
    IF NOT v_changed AND NEW.id = OLD.id THEN
      RETURN NULL;
    END IF;
    DELETE FROM mentions WHERE source_type = v_source_type AND source_id = OLD.id;
  END IF;

  FOR i IN 1 .. TG_NARGS - 1 LOOP
    INSERT INTO mentions (source_type, source_id, field, entity_type, entity_id)
    SELECT DISTINCT v_source_type, NEW.id, TG_ARGV[i], m[1], m[2]::UUID
    FROM regexp_matches(
      COALESCE(v_new #>> string_to_array(TG_ARGV[i], '.'), ''),
      '\]\(mention:(person|place|quest|note)/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\)',
      'g'
    ) AS m
    ON CONFLICT ON CONSTRAINT mentions_unique DO NOTHING;
  END LOOP;

  RETURN NULL;
END;
$$;

CREATE TRIGGER achievements_mentions
  AFTER INSERT OR UPDATE OR DELETE ON achievements
  FOR EACH ROW EXECUTE FUNCTION rebuild_mentions('achievement', 'description');

CREATE TRIGGER historic_events_mentions
  AFTER INSERT OR UPDATE OR DELETE ON historic_events
  FOR EACH ROW EXECUTE FUNCTION rebuild_mentions('historic_event', 'content');

CREATE TRIGGER info_boxes_mentions
  AFTER INSERT OR UPDATE OR DELETE ON info_boxes
  FOR EACH ROW EXECUTE FUNCTION rebuild_mentions('info_box', 'content');

CREATE TRIGGER notes_mentions
  AFTER INSERT OR UPDATE OR DELETE ON notes
  FOR EACH ROW EXECUTE FUNCTION rebuild_mentions('note', 'content');

CREATE TRIGGER quests_mentions
  AFTER INSERT OR UPDATE OR DELETE ON quests
  FOR EACH ROW EXECUTE FUNCTION rebuild_mentions('quest', 'description');

-- The app's "Regeln" field is the description column; the other texts are
-- type-specific and live in metadata.
CREATE TRIGGER rules_mentions
  AFTER INSERT OR UPDATE OR DELETE ON rules
  FOR EACH ROW EXECUTE FUNCTION rebuild_mentions(
    'rule', 'description', 'metadata.description', 'metadata.reversalis', 'metadata.variants'
  );

-- ============================================================================
-- RLS: a mention is visible to whoever can see its source
-- ============================================================================

-- SECURITY INVOKER on purpose: the lookups run under the caller's own RLS,
-- so "can see the source" means exactly what the source table's policy says.
CREATE FUNCTION mention_source_visible(p_source_type TEXT, p_source_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  CASE p_source_type
    WHEN 'achievement'    THEN RETURN EXISTS (SELECT 1 FROM achievements WHERE id = p_source_id);
    WHEN 'historic_event' THEN RETURN EXISTS (SELECT 1 FROM historic_events WHERE id = p_source_id);
    WHEN 'info_box'       THEN RETURN EXISTS (SELECT 1 FROM info_boxes WHERE id = p_source_id);
    WHEN 'note'           THEN RETURN EXISTS (SELECT 1 FROM notes WHERE id = p_source_id);
    WHEN 'quest'          THEN RETURN EXISTS (SELECT 1 FROM quests WHERE id = p_source_id);
    WHEN 'rule'           THEN RETURN EXISTS (SELECT 1 FROM rules WHERE id = p_source_id);
    ELSE RETURN FALSE;
  END CASE;
END;
$$;

ALTER TABLE mentions ENABLE ROW LEVEL SECURITY;

CREATE POLICY mentions_select_policy ON mentions
  FOR SELECT
  TO authenticated
  USING (mention_source_visible(source_type, source_id));

-- No write policies: only rebuild_mentions() writes. Revoking the privileges
-- as well keeps the API surface closed rather than relying on RLS alone.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON mentions FROM anon, authenticated;

-- ============================================================================
-- DELETED OR HIDDEN?
-- ============================================================================

-- A mention whose target the viewer cannot load is either hidden from them or
-- deleted. The renderer shows the two differently (plain label vs. struck
-- through), and only the database can tell them apart.
--
-- Takes [{"entity_type": "person", "entity_id": "…"}, …] and returns the
-- entries that exist. It reveals existence only, never a name or any other
-- column, and only for UUIDs the caller already has from a text they can read.
CREATE FUNCTION mention_targets_exist(p_refs JSONB)
RETURNS TABLE (entity_type TEXT, entity_id UUID)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT r.entity_type, r.entity_id
  FROM (
    SELECT * FROM jsonb_to_recordset(p_refs) AS x(entity_type TEXT, entity_id UUID)
    LIMIT 500
  ) AS r
  WHERE CASE r.entity_type
    WHEN 'person' THEN EXISTS (SELECT 1 FROM people WHERE id = r.entity_id)
    WHEN 'place'  THEN EXISTS (SELECT 1 FROM places WHERE id = r.entity_id)
    WHEN 'quest'  THEN EXISTS (SELECT 1 FROM quests WHERE id = r.entity_id)
    WHEN 'note'   THEN EXISTS (SELECT 1 FROM notes WHERE id = r.entity_id)
    ELSE FALSE
  END;
$$;

REVOKE ALL ON FUNCTION rebuild_mentions() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION mention_source_visible(TEXT, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION mention_targets_exist(JSONB) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION mention_source_visible(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mention_targets_exist(JSONB) TO authenticated;

-- ============================================================================
-- REALTIME
-- ============================================================================

-- Backlink lists update when another tab saves a text.
ALTER PUBLICATION supabase_realtime ADD TABLE mentions;
