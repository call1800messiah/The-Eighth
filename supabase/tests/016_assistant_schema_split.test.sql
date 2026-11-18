\set ON_ERROR_STOP 1
\set QUIET 1
\set claude '\'00000000-0000-4000-8000-00000000000d\''
\echo '016 assistant schema split'
BEGIN;

INSERT INTO people (id, name, race) VALUES
  ('00000000-0000-4000-8000-0000000016a1', 'Zaubrina', 'Elf'),
  ('00000000-0000-4000-8000-0000000016a2', 'Magnus', 'Mensch');
INSERT INTO person_tags (person_id, tag) VALUES
  ('00000000-0000-4000-8000-0000000016a1', 'magiebegabt'),
  ('00000000-0000-4000-8000-0000000016a2', 'magiebegabt'),
  ('00000000-0000-4000-8000-0000000016a2', 'adlig');
INSERT INTO notes (title, category) VALUES ('Gerücht', 'Gerüchte');

-- Granted to everyone but the assistant: must not count as readable.
CREATE TABLE t_not_assistant (id INT);
ALTER TABLE t_not_assistant ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON t_not_assistant TO authenticated;
CREATE POLICY t_not_assistant_select ON t_not_assistant FOR SELECT TO authenticated USING ((SELECT NOT is_assistant()));

-- Granted to the assistant, then denied by a restrictive policy.
CREATE TABLE t_denied (id INT);
ALTER TABLE t_denied ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON t_denied TO authenticated;
CREATE POLICY t_denied_select ON t_denied FOR SELECT TO authenticated USING ((SELECT is_assistant()));
CREATE POLICY t_denied_deny ON t_denied AS RESTRICTIVE FOR SELECT TO authenticated USING ((SELECT NOT is_assistant()));

-- A read policy but no SELECT grant (default privileges grant it, so revoke).
CREATE TABLE t_ungranted (id INT);
ALTER TABLE t_ungranted ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON t_ungranted FROM authenticated, PUBLIC;
CREATE POLICY t_ungranted_select ON t_ungranted FOR SELECT TO authenticated USING ((SELECT is_assistant()));

-- Granted to GMs or the assistant: readable.
CREATE TABLE t_gm_or_assistant (id INT);
ALTER TABLE t_gm_or_assistant ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON t_gm_or_assistant TO authenticated;
CREATE POLICY t_gm_or_assistant_select ON t_gm_or_assistant FOR SELECT TO authenticated
  USING ((SELECT is_gm()) OR (SELECT is_assistant()));

SELECT test.login(:claude);
CREATE TEMP TABLE listed AS SELECT t->>'name' AS name, t->'columns' AS columns FROM jsonb_array_elements(assistant_schema()) AS t;

SELECT test.eq((SELECT count(*) FROM listed WHERE name = 't_not_assistant'), 0::BIGINT, 'a policy for everyone but the assistant does not list the table');
SELECT test.eq((SELECT count(*) FROM listed WHERE name = 't_denied'), 0::BIGINT, 'a restrictive deny leaves the table out');
SELECT test.eq((SELECT count(*) FROM listed WHERE name = 't_ungranted'), 0::BIGINT, 'a table without SELECT grant is left out');
SELECT test.eq((SELECT count(*) FROM listed WHERE name = 't_gm_or_assistant'), 1::BIGINT, 'a policy naming the assistant among others lists the table');
SELECT test.eq((SELECT count(*) FROM listed WHERE name = 'people'), 1::BIGINT, 'people is still listed');
SELECT test.eq((SELECT count(*) FROM listed, jsonb_array_elements(columns) AS c WHERE c ? 'occurring'), 0::BIGINT,
               'the schema carries no value counts');

SELECT test.eq(assistant_column_values('person_tags'),
               '{"tag": [{"value": "magiebegabt", "count": 2}, {"value": "adlig", "count": 1}]}'::JSONB,
               'tag values, most frequent first');
SELECT test.eq(assistant_column_values('notes')->'category' @> '[{"value": "Gerüchte", "count": 1}]', true, 'note categories');
SELECT test.eq(assistant_column_values('people') ?& ARRAY['race'], true, 'people list their races');
SELECT test.eq(assistant_column_values('people') ? 'name', false, 'other columns list no values');
SELECT test.eq(assistant_column_values('places'), '{}'::JSONB, 'a table without counted columns gives {}');

SELECT test.login(NULL);
SELECT test.denied('SELECT assistant_column_values(''people'')', 'anon cannot count values');

ROLLBACK;
