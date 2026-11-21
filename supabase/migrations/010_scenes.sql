-- Scene images: pictures tagged with the people that appear in them.
--
-- A scene is its own access-controlled entity: the owner and GMs always see
-- it, everyone else needs a document_access row with entity_type = 'scene'.
-- Seeing a person does not imply seeing their scenes. The person page lists
-- the scenes a person is tagged in, so scene_people visibility follows the
-- parent scene.
--
-- Files live in the public bucket under scenes/<scene id>/. As with every
-- other image, RLS protects the rows (and therefore the URLs), not the bytes
-- behind a URL that has already been handed out.

CREATE TABLE scenes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image      TEXT NOT NULL DEFAULT '', -- storage path; '' until the upload completes
  caption    TEXT,
  owner_id   UUID DEFAULT auth.uid() REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- An id column like the other junction tables: RealtimeService.watchOne
-- filters on `id` for any table, which only type-checks if every table has one.
CREATE TABLE scene_people (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id  UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  UNIQUE (scene_id, person_id)
);

CREATE INDEX idx_scene_people_person ON scene_people(person_id);

-- DELETE payloads carry the whole row, not just the key.
ALTER TABLE scene_people REPLICA IDENTITY FULL;

-- ============================================================================
-- SCENES
-- ============================================================================

ALTER TABLE scenes ENABLE ROW LEVEL SECURITY;

CREATE POLICY scenes_select_policy ON scenes
  FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid() OR
    is_gm() OR
    EXISTS (
      SELECT 1 FROM document_access
      WHERE entity_type = 'scene'
      AND entity_id = scenes.id
      AND user_id = auth.uid()
    )
  );

-- Any signed-in user may create scenes; owner_id defaults to the caller.
CREATE POLICY scenes_insert_policy ON scenes
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid() OR is_gm());

CREATE POLICY scenes_update_policy ON scenes
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid() OR is_gm())
  WITH CHECK (owner_id = auth.uid() OR is_gm());

CREATE POLICY scenes_delete_policy ON scenes
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid() OR is_gm());

-- ============================================================================
-- SCENE PEOPLE
-- ============================================================================

ALTER TABLE scene_people ENABLE ROW LEVEL SECURITY;

-- The subquery is itself filtered by scenes_select_policy.
CREATE POLICY scene_people_select_policy ON scene_people
  FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM scenes WHERE scenes.id = scene_people.scene_id));

-- Only the scene's owner (or a GM) tags people, and only people they can see:
-- the people subquery is filtered by people_select_policy.
CREATE POLICY scene_people_insert_policy ON scene_people
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM scenes
      WHERE scenes.id = scene_people.scene_id
      AND (scenes.owner_id = auth.uid() OR is_gm())
    )
    AND EXISTS (SELECT 1 FROM people WHERE people.id = scene_people.person_id)
  );

CREATE POLICY scene_people_delete_policy ON scene_people
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM scenes
      WHERE scenes.id = scene_people.scene_id
      AND (scenes.owner_id = auth.uid() OR is_gm())
    )
  );

-- ============================================================================
-- SHARING
-- ============================================================================

-- Add the scene case so non-GM owners can share their scenes through the
-- document_access policies. CREATE OR REPLACE resets the function's settings,
-- so the search_path pinned in 007 is repeated here.
CREATE OR REPLACE FUNCTION is_entity_owner(p_entity_type TEXT, p_entity_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_owner_id UUID;
BEGIN
  CASE p_entity_type
    WHEN 'person'         THEN SELECT owner_id INTO v_owner_id FROM people WHERE id = p_entity_id;
    WHEN 'place'          THEN SELECT owner_id INTO v_owner_id FROM places WHERE id = p_entity_id;
    WHEN 'quest'          THEN SELECT owner_id INTO v_owner_id FROM quests WHERE id = p_entity_id;
    WHEN 'project'        THEN SELECT owner_id INTO v_owner_id FROM projects WHERE id = p_entity_id;
    WHEN 'achievement'    THEN SELECT owner_id INTO v_owner_id FROM achievements WHERE id = p_entity_id;
    WHEN 'inventory'      THEN SELECT owner_id INTO v_owner_id FROM inventory WHERE id = p_entity_id;
    WHEN 'note'           THEN SELECT owner_id INTO v_owner_id FROM notes WHERE id = p_entity_id;
    WHEN 'flow'           THEN SELECT owner_id INTO v_owner_id FROM flows WHERE id = p_entity_id;
    WHEN 'roll'           THEN SELECT owner_id INTO v_owner_id FROM rolls WHERE id = p_entity_id;
    WHEN 'info_box'       THEN SELECT owner_id INTO v_owner_id FROM info_boxes WHERE id = p_entity_id;
    WHEN 'scene'          THEN SELECT owner_id INTO v_owner_id FROM scenes WHERE id = p_entity_id;
    ELSE RETURN FALSE;
  END CASE;
  RETURN v_owner_id IS NOT NULL AND v_owner_id = auth.uid();
END;
$$;

-- ============================================================================
-- STORAGE: scenes/<scene id>/… belongs to the scene's owner
-- ============================================================================

-- Inside the subqueries the object path must be written objects.name (see 006).
CREATE POLICY "Users can upload scene files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'the-eighth'
  AND split_part(name, '/', 1) = 'scenes'
  AND (
    EXISTS (
      SELECT 1 FROM scenes
      WHERE owner_id = auth.uid()
      AND id::text = split_part(objects.name, '/', 2)
    )
    OR is_gm()
  )
);

CREATE POLICY "Users can update scene files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'the-eighth'
  AND split_part(name, '/', 1) = 'scenes'
  AND (
    EXISTS (
      SELECT 1 FROM scenes
      WHERE owner_id = auth.uid()
      AND id::text = split_part(objects.name, '/', 2)
    )
    OR is_gm()
  )
);

CREATE POLICY "Users can delete scene files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'the-eighth'
  AND split_part(name, '/', 1) = 'scenes'
  AND (
    EXISTS (
      SELECT 1 FROM scenes
      WHERE owner_id = auth.uid()
      AND id::text = split_part(objects.name, '/', 2)
    )
    OR is_gm()
  )
);

-- ============================================================================
-- REALTIME
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE scenes, scene_people;
