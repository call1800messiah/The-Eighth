\set ON_ERROR_STOP 1
\set QUIET 1
\set gm '\'00000000-0000-4000-8000-00000000000a\''
\set p1 '\'00000000-0000-4000-8000-00000000000b\''
\set p2 '\'00000000-0000-4000-8000-00000000000c\''
\echo '012 mentions'
BEGIN;
INSERT INTO people (id, name, owner_id) VALUES ('11111111-1111-4111-8111-111111111111', 'Alrik', :gm);
INSERT INTO places (id, name, type, owner_id) VALUES ('22222222-2222-4222-8222-222222222222', 'Gareth', 'city', :gm);

SELECT test.login(:gm);
INSERT INTO quests (id, name, type, description, owner_id) VALUES ('33333333-3333-4333-8333-333333333333', 'Q', 'main',
  'See [Alrik](mention:person/11111111-1111-4111-8111-111111111111) in [Gareth](mention:place/22222222-2222-4222-8222-222222222222), '
  'again [A](mention:person/11111111-1111-4111-8111-111111111111) and [x](https://example.com)', :gm);
SELECT test.eq((SELECT count(*) FROM mentions WHERE source_type = 'quest'), 2::BIGINT, 'insert records each target once');

CREATE TEMP TABLE before ON COMMIT DROP AS SELECT id FROM mentions;
UPDATE quests SET completed = true WHERE id = '33333333-3333-4333-8333-333333333333';
SELECT test.eq((SELECT count(*) FROM mentions JOIN before USING (id)), 2::BIGINT, 'non-text update keeps the rows');

UPDATE quests SET description = '[Gareth](mention:place/22222222-2222-4222-8222-222222222222)' WHERE id = '33333333-3333-4333-8333-333333333333';
SELECT test.eq((SELECT string_agg(entity_type, ',') FROM mentions WHERE source_type = 'quest'), 'place', 'text update rebuilds');

INSERT INTO rules (id, category, name, is_custom, description, metadata) VALUES ('44444444-4444-4444-8444-444444444444', 'spell', 'R', true, 'x',
  '{"variants": "[Alrik](mention:person/11111111-1111-4111-8111-111111111111)"}');
SELECT test.eq((SELECT field FROM mentions WHERE source_type = 'rule'), 'metadata.variants', 'JSONB fields are scanned');

SELECT test.login(:p1);
INSERT INTO notes (id, content, owner_id) VALUES ('55555555-5555-4555-8555-555555555555', '[Alrik](mention:person/11111111-1111-4111-8111-111111111111)', :p1);
SELECT test.eq((SELECT string_agg(source_type, ',' ORDER BY source_type) FROM mentions), 'note,rule', 'player 1 sees own note and the rule, not the GM quest');
SELECT test.denied($$INSERT INTO mentions (source_type, source_id, field, entity_type, entity_id) VALUES ('note', gen_random_uuid(), 'content', 'person', gen_random_uuid())$$, 'clients cannot write mentions');

SELECT test.login(:p2);
SELECT test.eq((SELECT string_agg(source_type, ',') FROM mentions), 'rule', 'player 2 does not see player 1''s note');
SELECT test.eq((SELECT count(*) FROM mention_targets_exist('[{"entity_type":"person","entity_id":"11111111-1111-4111-8111-111111111111"},{"entity_type":"place","entity_id":"99999999-9999-4999-8999-999999999999"}]')),
  1::BIGINT, 'existence check tells existing from deleted');

SELECT test.login(:gm);
DELETE FROM quests WHERE id = '33333333-3333-4333-8333-333333333333';
SELECT test.eq((SELECT count(*) FROM mentions WHERE source_type = 'quest'), 0::BIGINT, 'delete removes the rows');

SELECT test.login(NULL);
SELECT test.denied($$SELECT * FROM mention_targets_exist('[]')$$, 'anon cannot probe');
ROLLBACK;
