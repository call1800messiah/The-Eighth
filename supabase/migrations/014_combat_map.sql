-- Combat map: an optional battle map per combat session, a square grid laid
-- over it, and a token per combatant.
--
-- Everyone signed in sees the map live (combat is a shared space, see
-- combatants_select_policy). Only GMs change it: upload or remove the image,
-- set up the grid, move tokens. Players can still add combatants as before;
-- a combatant without a token row is drawn in the staging row at the top of
-- the map until the GM places it.
--
-- Coordinates are pixels of the map image (or of a blank 1600×1000 area
-- without one), so they do not change with the viewer's screen or zoom.
--
-- Players see the whole image: there is no fog of war. Do not upload maps
-- that give things away.

CREATE TABLE combat_maps (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  combat_session_id UUID NOT NULL UNIQUE REFERENCES combat_sessions(id) ON DELETE CASCADE,
  image            TEXT,       -- storage path, maps/<map id>/<name>-<nanoid>.<ext>
  image_width      INTEGER CHECK (image_width > 0),
  image_height     INTEGER CHECK (image_height > 0),
  grid_enabled     BOOLEAN NOT NULL DEFAULT true,
  grid_size        REAL NOT NULL DEFAULT 70 CHECK (grid_size BETWEEN 10 AND 500),   -- cell edge, in image pixels
  grid_offset_x    REAL NOT NULL DEFAULT 0,
  grid_offset_y    REAL NOT NULL DEFAULT 0,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((image IS NULL) = (image_width IS NULL) AND (image IS NULL) = (image_height IS NULL))
);

CREATE TABLE combat_tokens (
  combatant_id UUID PRIMARY KEY REFERENCES combatants(id) ON DELETE CASCADE,
  x            REAL NOT NULL,   -- token centre, in map pixels
  y            REAL NOT NULL,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- DELETE payloads carry the whole row.
ALTER TABLE combat_maps REPLICA IDENTITY FULL;
ALTER TABLE combat_tokens REPLICA IDENTITY FULL;

-- ============================================================================
-- RLS: everyone reads, GMs write
-- ============================================================================

ALTER TABLE combat_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE combat_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY combat_maps_select_policy ON combat_maps
  FOR SELECT TO authenticated USING (true);
CREATE POLICY combat_maps_gm_write ON combat_maps
  FOR ALL TO authenticated
  USING ((SELECT is_gm())) WITH CHECK ((SELECT is_gm()));

CREATE POLICY combat_tokens_select_policy ON combat_tokens
  FOR SELECT TO authenticated USING (true);
CREATE POLICY combat_tokens_gm_write ON combat_tokens
  FOR ALL TO authenticated
  USING ((SELECT is_gm())) WITH CHECK ((SELECT is_gm()));

-- Claude (the assistant role, migration 013) reads like a GM and writes
-- nothing here; FOR ALL above already excludes it, as it is not a GM.
CREATE POLICY combat_maps_assistant_read ON combat_maps
  FOR SELECT TO authenticated USING ((SELECT is_assistant()));
CREATE POLICY combat_tokens_assistant_read ON combat_tokens
  FOR SELECT TO authenticated USING ((SELECT is_assistant()));

-- ============================================================================
-- STORAGE: maps/<map id>/… is GM-only
-- ============================================================================

-- Reading needs no policy: the bucket is public. Inside the subqueries the
-- object path must be written objects.name (see 006).
CREATE POLICY "GMs can upload map files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'the-eighth'
  AND split_part(name, '/', 1) = 'maps'
  AND is_gm()
  AND EXISTS (SELECT 1 FROM combat_maps WHERE id::text = split_part(objects.name, '/', 2))
);

CREATE POLICY "GMs can update map files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'the-eighth'
  AND split_part(name, '/', 1) = 'maps'
  AND is_gm()
);

CREATE POLICY "GMs can delete map files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'the-eighth'
  AND split_part(name, '/', 1) = 'maps'
  AND is_gm()
);

-- ============================================================================
-- REALTIME
-- ============================================================================

-- Players' screens follow the GM: image, grid and every token move.
ALTER PUBLICATION supabase_realtime ADD TABLE combat_maps, combat_tokens;
