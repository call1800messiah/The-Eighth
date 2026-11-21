\set ON_ERROR_STOP 1
\set QUIET 1
\set gm '\'00000000-0000-4000-8000-00000000000a\''
\set p1 '\'00000000-0000-4000-8000-00000000000b\''
\set claude '\'00000000-0000-4000-8000-00000000000d\''
\set session '\'c0000000-0000-4000-8000-000000000001\''
\set map '\'c0000000-0000-4000-8000-0000000000aa\''
\set fighter '\'c0000000-0000-4000-8000-0000000000f1\''
\echo '014 combat map'
BEGIN;
INSERT INTO storage.buckets (id, name, public) VALUES ('the-eighth', 'the-eighth', true) ON CONFLICT DO NOTHING;
INSERT INTO combat_sessions (id, name) VALUES (:session, 'Kampf');

-- ── GM sets up the map ────────────────────────────────────────────────────
SELECT test.login(:gm);
INSERT INTO combat_maps (id, combat_session_id, grid_size) VALUES (:map, :session, 50);
DO $$ BEGIN
  INSERT INTO combat_maps (combat_session_id) VALUES ('c0000000-0000-4000-8000-000000000001');
  RAISE EXCEPTION 'FAIL second map for a session was allowed';
EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'ok   one map per session';
END $$;
DO $$ BEGIN
  UPDATE combat_maps SET image = 'maps/x/a.png';
  RAISE EXCEPTION 'FAIL image without size was allowed';
EXCEPTION WHEN check_violation THEN RAISE NOTICE 'ok   an image needs its size';
END $$;
UPDATE combat_maps SET image = 'maps/' || :map || '/karte-abc.png', image_width = 2000, image_height = 1400;
INSERT INTO storage.objects (bucket_id, name) VALUES ('the-eighth', 'maps/' || :map || '/karte-abc.png');
SELECT test.denied($$INSERT INTO storage.objects (bucket_id, name) VALUES ('the-eighth', 'maps/c0000000-0000-4000-8000-0000000000ff/x.png')$$, 'no files for a map that does not exist');

-- ── A player adds a combatant; only the GM places it ──────────────────────
SELECT test.login(:p1);
INSERT INTO combatants (id, combat_session_id, name) VALUES (:fighter, :session, 'Ork');
SELECT test.eq((SELECT grid_size FROM combat_maps), 50::REAL, 'player sees the map');
SELECT test.denied($$INSERT INTO combat_tokens (combatant_id, x, y) VALUES ('c0000000-0000-4000-8000-0000000000f1', 10, 10)$$, 'player cannot place tokens');
SELECT test.eq(test.affected($$UPDATE combat_maps SET grid_enabled = false$$), 0, 'player cannot change the grid');
SELECT test.eq(test.affected($$DELETE FROM combat_maps$$), 0, 'player cannot remove the map');
SELECT test.denied($$INSERT INTO storage.objects (bucket_id, name) VALUES ('the-eighth', 'maps/c0000000-0000-4000-8000-0000000000aa/spoiler.png')$$, 'player cannot upload maps');
SELECT test.eq(test.affected($$DELETE FROM storage.objects WHERE name LIKE 'maps/%'$$), 0, 'player cannot delete map files');

SELECT test.login(:gm);
INSERT INTO combat_tokens (combatant_id, x, y) VALUES (:fighter, 125, 75);
UPDATE combat_tokens SET x = 175 WHERE combatant_id = :fighter;

SELECT test.login(:p1);
SELECT test.eq((SELECT x FROM combat_tokens WHERE combatant_id = :fighter), 175::REAL, 'player sees the token move');
SELECT test.eq(test.affected($$UPDATE combat_tokens SET x = 0$$), 0, 'player cannot move tokens');

-- ── Claude reads, writes nothing ──────────────────────────────────────────
SELECT test.login(:claude);
SELECT test.eq((SELECT count(*) FROM combat_tokens), 1::BIGINT, 'assistant reads tokens');
SELECT test.eq(test.affected($$UPDATE combat_tokens SET x = 0$$), 0, 'assistant cannot move tokens');

-- ── Removing a combatant removes its token ────────────────────────────────
SELECT test.login(:p1);
DELETE FROM combatants WHERE id = :fighter;
SELECT test.eq((SELECT count(*) FROM combat_tokens), 0::BIGINT, 'token goes with its combatant');
ROLLBACK;
