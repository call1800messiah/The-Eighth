\set ON_ERROR_STOP 1
\set QUIET 1
\set gm '\'00000000-0000-4000-8000-00000000000a\''
\set p1 '\'00000000-0000-4000-8000-00000000000b\''
\set claude '\'00000000-0000-4000-8000-00000000000d\''
\set pub '\'11111111-1111-4111-8111-111111111111\''
\set draft '\'d0000000-0000-4000-8000-000000000001\''
\echo '018 structured dates'
BEGIN;
INSERT INTO people (id, name, owner_id) VALUES (:pub, 'Alrik', :gm);
INSERT INTO campaign (id, name) VALUES ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Reise');

-- ── Columns ───────────────────────────────────────────────────────────────
SELECT test.eq((SELECT count(*) FROM information_schema.columns WHERE table_name = 'people'
  AND column_name IN ('birth_day', 'birth_precision', 'death_day', 'death_precision', 'birthday_legacy', 'birthyear_legacy', 'deathday_legacy')),
  7::BIGINT, 'people has the new and legacy date columns');
SELECT test.eq((SELECT count(*) FROM information_schema.columns WHERE table_name = 'campaign'
  AND column_name IN ('date_day', 'date_precision', 'date_legacy')), 3::BIGINT, 'campaign has the new and legacy date columns');
SELECT test.eq((SELECT count(*) FROM information_schema.columns WHERE table_name = 'historic_events'
  AND column_name IN ('date_day', 'date_precision', 'date_legacy')), 3::BIGINT, 'historic_events has the new and legacy date columns');
SELECT test.eq((SELECT count(*) FROM information_schema.columns WHERE table_name IN ('people', 'campaign', 'historic_events')
  AND column_name IN ('birthday', 'birthyear', 'deathday', 'date')), 0::BIGINT, 'the old text columns are gone');

-- ── Day and precision come as a pair ──────────────────────────────────────
SELECT test.login(:gm);
DO $$ BEGIN
  UPDATE campaign SET date_day = 5;
  RAISE EXCEPTION 'FAIL day without precision was allowed';
EXCEPTION WHEN check_violation THEN RAISE NOTICE 'ok   day without precision is refused';
END $$;
DO $$ BEGIN
  UPDATE campaign SET date_precision = 'day';
  RAISE EXCEPTION 'FAIL precision without day was allowed';
EXCEPTION WHEN check_violation THEN RAISE NOTICE 'ok   precision without day is refused';
END $$;
DO $$ BEGIN
  UPDATE campaign SET date_day = 5, date_precision = 'week';
  RAISE EXCEPTION 'FAIL unknown precision was allowed';
EXCEPTION WHEN check_violation THEN RAISE NOTICE 'ok   unknown precision is refused';
END $$;
DO $$ BEGIN
  UPDATE people SET birth_day = 5 WHERE id = '11111111-1111-4111-8111-111111111111';
  RAISE EXCEPTION 'FAIL birth day without precision was allowed';
EXCEPTION WHEN check_violation THEN RAISE NOTICE 'ok   birth day without precision is refused';
END $$;
DO $$ BEGIN
  UPDATE people SET death_precision = 'year' WHERE id = '11111111-1111-4111-8111-111111111111';
  RAISE EXCEPTION 'FAIL death precision without day was allowed';
EXCEPTION WHEN check_violation THEN RAISE NOTICE 'ok   death precision without day is refused';
END $$;
SELECT test.eq(test.affected($$UPDATE campaign SET date_day = -5, date_precision = 'month'$$), 1, 'GM sets the campaign date (negative days are fine)');
SELECT test.eq(test.affected($$UPDATE campaign SET date_day = NULL, date_precision = NULL$$), 1, 'GM clears the campaign date');
SELECT test.eq(test.affected($$UPDATE people SET birth_day = 100, birth_precision = 'year', death_day = 200, death_precision = 'day' WHERE id = '11111111-1111-4111-8111-111111111111'$$), 1, 'GM sets birth and death');

-- ── Players cannot write the campaign date ────────────────────────────────
SELECT test.login(:p1);
SELECT test.eq(test.affected($$UPDATE campaign SET date_day = 9, date_precision = 'day'$$), 0, 'player cannot set the campaign date');

-- ── The assistant sets dates on its own draft only ────────────────────────
SELECT test.login(:claude);
INSERT INTO people (id, name, owner_id, status) VALUES (:draft, 'Draft Person', :claude, 'draft');
SELECT test.eq(test.affected($$UPDATE people SET birth_day = 7, birth_precision = 'month' WHERE id = 'd0000000-0000-4000-8000-000000000001'$$), 1, 'assistant sets birth on its draft');
SELECT test.eq(test.affected($$UPDATE people SET birth_day = 7, birth_precision = 'month' WHERE id = '11111111-1111-4111-8111-111111111111'$$), 0, 'assistant cannot set birth on a published person');

ROLLBACK;
