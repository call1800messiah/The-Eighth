-- Claude as a planning assistant: drafts, the assistant role, and the OAuth
-- state of the MCP server (mcp/).
--
-- The MCP server acts as one dedicated Supabase user, never as a person's
-- account. That user has the `assistant` role and nothing else:
--
--   * it can read whatever a GM can read, so it can search before creating;
--   * it can insert people, places and quests only as drafts it owns, and
--     change or delete only its own drafts (plus their info boxes and
--     relationships);
--   * it can write nothing else.
--
-- Drafts are visible to GMs and the assistant only. A GM publishes a draft
-- (it becomes theirs) or discards it from the review queue in the app.
--
-- Run this file with plain `psql -f` (as scripts/run-migrations.sh does): the
-- new enum value has to be committed before the functions below use it.

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'assistant';

CREATE OR REPLACE FUNCTION public.is_assistant() RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'assistant'
  );
$$;

REVOKE ALL ON FUNCTION is_assistant() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION is_assistant() TO authenticated;

-- ============================================================================
-- DRAFT STATUS
-- ============================================================================

CREATE TYPE entity_status AS ENUM ('draft', 'published');

ALTER TABLE people ADD COLUMN status entity_status NOT NULL DEFAULT 'published';
ALTER TABLE places ADD COLUMN status entity_status NOT NULL DEFAULT 'published';
ALTER TABLE quests ADD COLUMN status entity_status NOT NULL DEFAULT 'published';

-- The review queue lists drafts; they are few among many published rows.
CREATE INDEX idx_people_drafts ON people(created_at) WHERE status = 'draft';
CREATE INDEX idx_places_drafts ON places(created_at) WHERE status = 'draft';
CREATE INDEX idx_quests_drafts ON quests(created_at) WHERE status = 'draft';

-- Whether an entity is a draft owned by the caller. SECURITY INVOKER: it is
-- only ever true for rows the caller can see anyway.
CREATE FUNCTION is_own_draft(p_entity_type TEXT, p_entity_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  CASE p_entity_type
    WHEN 'person' THEN RETURN EXISTS (SELECT 1 FROM people WHERE id = p_entity_id AND status = 'draft' AND owner_id = auth.uid());
    WHEN 'place'  THEN RETURN EXISTS (SELECT 1 FROM places WHERE id = p_entity_id AND status = 'draft' AND owner_id = auth.uid());
    WHEN 'quest'  THEN RETURN EXISTS (SELECT 1 FROM quests WHERE id = p_entity_id AND status = 'draft' AND owner_id = auth.uid());
    ELSE RETURN FALSE;
  END CASE;
END;
$$;

REVOKE ALL ON FUNCTION is_own_draft(TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION is_own_draft(TEXT, UUID) TO authenticated;

-- ============================================================================
-- ASSISTANT: READ LIKE A GM, WRITE NOTHING BY DEFAULT
-- ============================================================================

-- Added to every table that has RLS at this point. A table created later gets
-- neither policy, so the assistant can neither read nor write it until a
-- migration says otherwise.
--
-- `(SELECT is_assistant())` is evaluated once per query, not once per row.
-- The deny policies are RESTRICTIVE: they are ANDed with the existing
-- policies, so an owner check elsewhere cannot let the assistant through.
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity
    ORDER BY c.relname
  LOOP
    EXECUTE format(
      'CREATE POLICY %I ON %I AS PERMISSIVE FOR SELECT TO authenticated USING ((SELECT is_assistant()))',
      t || '_assistant_read', t);

    -- Drafts and what hangs off them get their own rules below.
    CONTINUE WHEN t IN ('people', 'places', 'quests', 'info_boxes', 'person_relationships');

    EXECUTE format(
      'CREATE POLICY %I ON %I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK ((SELECT NOT is_assistant()))',
      t || '_assistant_no_insert', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I AS RESTRICTIVE FOR UPDATE TO authenticated USING ((SELECT NOT is_assistant()))',
      t || '_assistant_no_update', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I AS RESTRICTIVE FOR DELETE TO authenticated USING ((SELECT NOT is_assistant()))',
      t || '_assistant_no_delete', t);
  END LOOP;
END;
$$;

-- No uploads, no deletions in storage either.
DO $$
BEGIN
  IF to_regclass('storage.objects') IS NOT NULL THEN
    EXECUTE 'CREATE POLICY "Assistant cannot upload" ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK ((SELECT NOT public.is_assistant()))';
    EXECUTE 'CREATE POLICY "Assistant cannot update" ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated USING ((SELECT NOT public.is_assistant()))';
    EXECUTE 'CREATE POLICY "Assistant cannot delete" ON storage.objects AS RESTRICTIVE FOR DELETE TO authenticated USING ((SELECT NOT public.is_assistant()))';
  END IF;
END;
$$;

-- ============================================================================
-- DRAFTS: WHO SEES THEM, WHO WRITES THEM
-- ============================================================================

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['people', 'places', 'quests'] LOOP
    -- Hidden from everyone but GMs and the assistant, including from
    -- document_access grants and the owner check of the existing policy.
    EXECUTE format(
      'CREATE POLICY %I ON %I AS RESTRICTIVE FOR SELECT TO authenticated
         USING (status = ''published'' OR (SELECT is_gm()) OR (SELECT is_assistant()))',
      t || '_drafts_hidden', t);

    -- The assistant only creates drafts, and only as itself.
    EXECUTE format(
      'CREATE POLICY %I ON %I AS RESTRICTIVE FOR INSERT TO authenticated
         WITH CHECK ((SELECT NOT is_assistant()) OR (status = ''draft'' AND owner_id = auth.uid()))',
      t || '_assistant_drafts_only', t);

    -- ...and only touches its own drafts, which stay drafts.
    EXECUTE format(
      'CREATE POLICY %I ON %I AS RESTRICTIVE FOR UPDATE TO authenticated
         USING ((SELECT NOT is_assistant()) OR (status = ''draft'' AND owner_id = auth.uid()))
         WITH CHECK ((SELECT NOT is_assistant()) OR (status = ''draft'' AND owner_id = auth.uid()))',
      t || '_assistant_own_drafts_update', t);

    EXECUTE format(
      'CREATE POLICY %I ON %I AS RESTRICTIVE FOR DELETE TO authenticated
         USING ((SELECT NOT is_assistant()) OR (status = ''draft'' AND owner_id = auth.uid()))',
      t || '_assistant_own_drafts_delete', t);
  END LOOP;
END;
$$;

-- Info boxes (appearance, background, …) of the assistant's own drafts.
CREATE POLICY info_boxes_assistant_insert ON info_boxes AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK ((SELECT NOT is_assistant()) OR is_own_draft(entity_type, entity_id));
CREATE POLICY info_boxes_assistant_update ON info_boxes AS RESTRICTIVE FOR UPDATE TO authenticated
  USING ((SELECT NOT is_assistant()) OR is_own_draft(entity_type, entity_id))
  WITH CHECK ((SELECT NOT is_assistant()) OR is_own_draft(entity_type, entity_id));
CREATE POLICY info_boxes_assistant_delete ON info_boxes AS RESTRICTIVE FOR DELETE TO authenticated
  USING ((SELECT NOT is_assistant()) OR is_own_draft(entity_type, entity_id));

-- Relationships from one of its drafts to anyone.
CREATE POLICY person_relationships_assistant_insert ON person_relationships AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK ((SELECT NOT is_assistant()) OR is_own_draft('person', person_id));
CREATE POLICY person_relationships_assistant_update ON person_relationships AS RESTRICTIVE FOR UPDATE TO authenticated
  USING ((SELECT NOT is_assistant()) OR is_own_draft('person', person_id))
  WITH CHECK ((SELECT NOT is_assistant()) OR is_own_draft('person', person_id));
CREATE POLICY person_relationships_assistant_delete ON person_relationships AS RESTRICTIVE FOR DELETE TO authenticated
  USING ((SELECT NOT is_assistant()) OR is_own_draft('person', person_id));

-- ============================================================================
-- REVIEW: PUBLISH OR DISCARD (GM only)
-- ============================================================================

-- The relationship kinds the app shows, and their reverse.
CREATE FUNCTION inverse_relationship(p_type TEXT) RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT CASE p_type
    WHEN 'parents'  THEN 'children'
    WHEN 'children' THEN 'parents'
    WHEN 'partners' THEN 'partners'
    WHEN 'siblings' THEN 'siblings'
  END;
$$;

-- Makes a draft an ordinary entity owned by the publishing GM, together with
-- the info boxes the assistant wrote for it. The assistant can only write
-- relationships from its own drafts, so the reverse direction is added here.
--
-- SECURITY INVOKER: the GM's own RLS rights do the writing.
CREATE FUNCTION publish_draft(p_entity_type TEXT, p_entity_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_author UUID;
BEGIN
  IF NOT is_gm() THEN
    RAISE EXCEPTION 'Only a GM can publish drafts' USING ERRCODE = '42501';
  END IF;

  CASE p_entity_type
    WHEN 'person' THEN
      UPDATE people p SET status = 'published', owner_id = auth.uid()
      FROM (SELECT owner_id FROM people WHERE id = p_entity_id) old
      WHERE p.id = p_entity_id AND p.status = 'draft' RETURNING old.owner_id INTO v_author;
    WHEN 'place' THEN
      UPDATE places p SET status = 'published', owner_id = auth.uid()
      FROM (SELECT owner_id FROM places WHERE id = p_entity_id) old
      WHERE p.id = p_entity_id AND p.status = 'draft' RETURNING old.owner_id INTO v_author;
    WHEN 'quest' THEN
      UPDATE quests p SET status = 'published', owner_id = auth.uid()
      FROM (SELECT owner_id FROM quests WHERE id = p_entity_id) old
      WHERE p.id = p_entity_id AND p.status = 'draft' RETURNING old.owner_id INTO v_author;
    ELSE
      RAISE EXCEPTION 'Unknown entity type %', p_entity_type USING ERRCODE = '22023';
  END CASE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No draft % %', p_entity_type, p_entity_id USING ERRCODE = 'P0002';
  END IF;

  UPDATE info_boxes SET owner_id = auth.uid()
  WHERE entity_type = p_entity_type AND entity_id = p_entity_id AND owner_id IS NOT DISTINCT FROM v_author;

  IF p_entity_type = 'person' THEN
    INSERT INTO person_relationships (person_id, related_person_id, relationship_type)
    SELECT related_person_id, person_id, inverse_relationship(relationship_type)
    FROM person_relationships
    WHERE person_id = p_entity_id AND inverse_relationship(relationship_type) IS NOT NULL
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

-- Deletes a draft with everything that only exists for it. Info boxes and
-- sharing rows are polymorphic (no foreign key), so they do not cascade.
CREATE FUNCTION discard_draft(p_entity_type TEXT, p_entity_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT is_gm() THEN
    RAISE EXCEPTION 'Only a GM can discard drafts' USING ERRCODE = '42501';
  END IF;

  CASE p_entity_type
    WHEN 'person' THEN DELETE FROM people WHERE id = p_entity_id AND status = 'draft';
    WHEN 'place'  THEN DELETE FROM places WHERE id = p_entity_id AND status = 'draft';
    WHEN 'quest'  THEN DELETE FROM quests WHERE id = p_entity_id AND status = 'draft';
    ELSE RAISE EXCEPTION 'Unknown entity type %', p_entity_type USING ERRCODE = '22023';
  END CASE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No draft % %', p_entity_type, p_entity_id USING ERRCODE = 'P0002';
  END IF;

  DELETE FROM info_boxes WHERE entity_type = p_entity_type AND entity_id = p_entity_id;
  DELETE FROM document_access WHERE entity_type = p_entity_type AND entity_id = p_entity_id;
END;
$$;

REVOKE ALL ON FUNCTION publish_draft(TEXT, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION discard_draft(TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION publish_draft(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION discard_draft(TEXT, UUID) TO authenticated;

-- ============================================================================
-- MCP SERVER: OAUTH STATE
-- ============================================================================

-- Clients that registered themselves (OAuth dynamic client registration).
-- Registration is open by design; a client can do nothing until a GM approves
-- a connection for it.
CREATE TABLE mcp_clients (
  client_id   TEXT PRIMARY KEY,
  metadata    JSONB NOT NULL,          -- the full registration, as the SDK returns it
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One row per connection a GM approved by logging in during the OAuth flow.
-- Revoking it ends every token issued under it.
CREATE TABLE mcp_grants (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    TEXT NOT NULL REFERENCES mcp_clients(client_id) ON DELETE CASCADE,
  client_name  TEXT,
  approved_by  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  revoked_at   TIMESTAMPTZ
);

-- Access and refresh tokens, stored as SHA-256 hashes only. A refresh token
-- is used once (rotation); presenting a used one again revokes the grant.
CREATE TABLE mcp_tokens (
  token_hash TEXT PRIMARY KEY,
  grant_id   UUID NOT NULL REFERENCES mcp_grants(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL CHECK (kind IN ('access', 'refresh')),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mcp_tokens_grant ON mcp_tokens(grant_id);
CREATE INDEX idx_mcp_tokens_expiry ON mcp_tokens(expires_at);

ALTER TABLE mcp_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY mcp_clients_assistant ON mcp_clients
  FOR ALL TO authenticated
  USING ((SELECT is_assistant())) WITH CHECK ((SELECT is_assistant()));

CREATE POLICY mcp_tokens_assistant ON mcp_tokens
  FOR ALL TO authenticated
  USING ((SELECT is_assistant())) WITH CHECK ((SELECT is_assistant()));

-- GMs list and revoke connections in the app; the server reads them, marks
-- them used, and revokes one on refresh-token reuse. Nobody inserts directly:
-- see approve_mcp_grant().
CREATE POLICY mcp_grants_select ON mcp_grants
  FOR SELECT TO authenticated
  USING ((SELECT is_gm()) OR (SELECT is_assistant()));
CREATE POLICY mcp_grants_update ON mcp_grants
  FOR UPDATE TO authenticated
  USING ((SELECT is_gm()) OR (SELECT is_assistant()))
  WITH CHECK ((SELECT is_gm()) OR (SELECT is_assistant()));
CREATE POLICY mcp_grants_delete ON mcp_grants
  FOR DELETE TO authenticated
  USING ((SELECT is_gm()));

REVOKE ALL ON mcp_clients, mcp_grants, mcp_tokens FROM anon;
REVOKE INSERT, UPDATE ON mcp_grants FROM authenticated;
GRANT UPDATE (last_used_at, revoked_at) ON mcp_grants TO authenticated;

-- Called with the GM's own session, from the login step of the OAuth flow:
-- the database itself checks that whoever approves a connection is a GM,
-- rather than trusting the MCP server to have checked.
CREATE FUNCTION approve_mcp_grant(p_client_id TEXT, p_client_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF NOT is_gm() THEN
    RAISE EXCEPTION 'Only a GM can approve an MCP connection' USING ERRCODE = '42501';
  END IF;
  INSERT INTO mcp_grants (client_id, client_name, approved_by)
  VALUES (p_client_id, left(p_client_name, 200), auth.uid())
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION approve_mcp_grant(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION approve_mcp_grant(TEXT, TEXT) TO authenticated;

-- ============================================================================
-- REALTIME
-- ============================================================================

-- The review page updates as Claude adds drafts and as connections are used.
ALTER PUBLICATION supabase_realtime ADD TABLE mcp_grants;
