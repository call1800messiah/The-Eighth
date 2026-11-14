\set ON_ERROR_STOP 1
\set QUIET 1
\set p1 '\'00000000-0000-4000-8000-00000000000b\''
\set claude '\'00000000-0000-4000-8000-00000000000d\''
\echo '015 assistant schema'
BEGIN;

-- A table nobody gave the assistant a read policy for.
CREATE TABLE t_unread (id INT);
ALTER TABLE t_unread ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON t_unread TO authenticated;

SELECT test.login(:claude);
CREATE TEMP TABLE schema_tables AS
  SELECT t->>'name' AS name, t->>'note' AS note, t->'columns' AS columns
  FROM jsonb_array_elements(assistant_schema()) AS t;

SELECT test.eq((SELECT note IS NOT NULL FROM schema_tables WHERE name = 'people'), true, 'people is listed with a note');
SELECT test.eq((SELECT c->>'references' FROM schema_tables, jsonb_array_elements(columns) AS c
                WHERE name = 'people' AND c->>'name' = 'location_id'), 'places.id', 'foreign keys name their target');
SELECT test.eq((SELECT (c->>'nullable')::BOOLEAN FROM schema_tables, jsonb_array_elements(columns) AS c
                WHERE name = 'people' AND c->>'name' = 'name'), false, 'NOT NULL columns are not nullable');
SELECT test.eq((SELECT c->'values' ? 'advantage' FROM schema_tables, jsonb_array_elements(columns) AS c
                WHERE name = 'rules' AND c->>'name' = 'category'), true, 'enum columns list their values');
SELECT test.eq((SELECT c->>'note' IS NOT NULL FROM schema_tables, jsonb_array_elements(columns) AS c
                WHERE name = 'rules' AND c->>'name' = 'metadata'), true, 'columns carry their comments');
SELECT test.eq((SELECT count(*) FROM schema_tables WHERE name = 'combat_maps'), 1::BIGINT, 'tables with their own assistant policy are listed');
SELECT test.eq((SELECT count(*) FROM schema_tables WHERE note IS NULL), 0::BIGINT, 'every listed table has a note');
SELECT test.eq((SELECT count(*) FROM schema_tables WHERE name LIKE 'mcp\_%'), 0::BIGINT, 'connection tables are left out');
SELECT test.eq((SELECT count(*) FROM schema_tables WHERE name = 't_unread'), 0::BIGINT, 'tables the assistant cannot read are left out');

SELECT test.login(NULL);
SELECT test.denied('SELECT assistant_schema()', 'anon cannot read the schema');

ROLLBACK;
