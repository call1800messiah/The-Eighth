\set ON_ERROR_STOP 1
\set QUIET 1
\set gm '\'00000000-0000-4000-8000-00000000000a\''
\set p1 '\'00000000-0000-4000-8000-00000000000b\''
\set claude '\'00000000-0000-4000-8000-00000000000d\''
\set gm_person '\'11111111-1111-4111-8111-111111111111\''
\set draft '\'d0000000-0000-4000-8000-000000000001\''
\set draft2 '\'d0000000-0000-4000-8000-000000000002\''
\echo '013 claude drafts'
BEGIN;
INSERT INTO people (id, name, owner_id) VALUES (:gm_person, 'Alrik', :gm);
INSERT INTO notes (id, title, content, owner_id) VALUES ('55555555-5555-4555-8555-555555555555', 'GM secret', 'x', :gm);
INSERT INTO flows (id, title, date, owner_id) VALUES ('66666666-6666-4666-8666-666666666666', 'Session 1', NOW(), :gm);

-- ── The assistant reads like a GM ──────────────────────────────────────────
SELECT test.login(:claude);
SELECT test.eq((SELECT count(*) FROM people WHERE id = :gm_person), 1::BIGINT, 'assistant reads GM-only people');
SELECT test.eq((SELECT count(*) FROM notes), 1::BIGINT, 'assistant reads GM-only notes');
SELECT test.eq(is_gm(), false, 'assistant is not a GM');

-- ── ...and only writes drafts of its own ──────────────────────────────────
INSERT INTO people (id, name, owner_id, status) VALUES (:draft, 'Draft Person', :claude, 'draft');
INSERT INTO places (id, name, type, owner_id, status) VALUES ('d0000000-0000-4000-8000-0000000000a1', 'Draft Place', 'town', :claude, 'draft');
INSERT INTO quests (id, name, type, owner_id, status) VALUES ('d0000000-0000-4000-8000-0000000000b1', 'Draft Quest', 'main', :claude, 'draft');
SELECT test.eq((SELECT count(*) FROM people WHERE status = 'draft'), 1::BIGINT, 'assistant inserts and reads its draft');
SELECT test.denied($$INSERT INTO people (name, owner_id) VALUES ('Published', '00000000-0000-4000-8000-00000000000d')$$, 'no published inserts');
SELECT test.denied($$INSERT INTO people (name, owner_id, status) VALUES ('For GM', '00000000-0000-4000-8000-00000000000a', 'draft')$$, 'no drafts in someone else''s name');
SELECT test.eq(test.affected($$UPDATE people SET title = 'Händler' WHERE id = 'd0000000-0000-4000-8000-000000000001'$$), 1, 'updates its own draft');
SELECT test.denied($$UPDATE people SET status = 'published' WHERE id = 'd0000000-0000-4000-8000-000000000001'$$, 'cannot publish its draft');
SELECT test.eq(test.affected($$UPDATE people SET title = 'x' WHERE id = '11111111-1111-4111-8111-111111111111'$$), 0, 'cannot update published people');
SELECT test.eq(test.affected($$DELETE FROM people WHERE id = '11111111-1111-4111-8111-111111111111'$$), 0, 'cannot delete published people');

INSERT INTO info_boxes (type, content, entity_type, entity_id, owner_id) VALUES ('background', 'Kennt [Alrik](mention:person/11111111-1111-4111-8111-111111111111).', 'person', :draft, :claude);
SELECT test.eq((SELECT count(*) FROM mentions WHERE source_type = 'info_box'), 1::BIGINT, 'its info boxes get mentions');
SELECT test.denied($$INSERT INTO info_boxes (type, content, entity_type, entity_id, owner_id) VALUES ('note', 'x', 'person', '11111111-1111-4111-8111-111111111111', '00000000-0000-4000-8000-00000000000d')$$, 'no info boxes on published entities');

INSERT INTO person_relationships (person_id, related_person_id, relationship_type) VALUES (:draft, :gm_person, 'siblings');
SELECT test.denied($$INSERT INTO person_relationships (person_id, related_person_id, relationship_type) VALUES ('11111111-1111-4111-8111-111111111111', 'd0000000-0000-4000-8000-000000000001', 'siblings')$$, 'no relationships from published people');

SELECT test.denied($$INSERT INTO notes (content, owner_id) VALUES ('x', '00000000-0000-4000-8000-00000000000d')$$, 'no notes');
SELECT test.denied($$INSERT INTO flows (title, date, owner_id) VALUES ('x', NOW(), '00000000-0000-4000-8000-00000000000d')$$, 'no flows');
SELECT test.denied($$INSERT INTO document_access (entity_type, entity_id, user_id) VALUES ('person', 'd0000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-00000000000b')$$, 'cannot share');
SELECT test.denied($$INSERT INTO user_roles (user_id, role) VALUES ('00000000-0000-4000-8000-00000000000d', 'gm')$$, 'cannot make itself GM');
SELECT test.eq(test.affected($$UPDATE notes SET content = 'y'$$), 0, 'cannot update notes');
SELECT test.eq(test.affected($$DELETE FROM flows$$), 0, 'cannot delete flows');

-- ── OAuth state ──────────────────────────────────────────────────────────
INSERT INTO mcp_clients (client_id, metadata) VALUES ('client-1', '{"client_name": "Claude"}');
SELECT test.denied($$INSERT INTO mcp_grants (client_id, approved_by) VALUES ('client-1', '00000000-0000-4000-8000-00000000000a')$$, 'assistant cannot approve a grant itself');
SELECT test.denied($$SELECT approve_mcp_grant('client-1', 'Claude')$$, 'approve_mcp_grant needs a GM');

-- ── Players never see drafts or connections ───────────────────────────────
RESET ROLE;
INSERT INTO document_access (entity_type, entity_id, user_id) VALUES ('person', :draft, :p1);
SELECT test.login(:p1);
SELECT test.eq((SELECT count(*) FROM people WHERE status = 'draft'), 0::BIGINT, 'player does not see drafts, even when shared');
SELECT test.eq((SELECT count(*) FROM info_boxes WHERE entity_id = :draft), 0::BIGINT, 'player does not see draft info boxes');
SELECT test.eq((SELECT count(*) FROM mcp_clients) + (SELECT count(*) FROM mcp_tokens), 0::BIGINT, 'player sees no OAuth state');
SELECT test.denied($$SELECT publish_draft('person', 'd0000000-0000-4000-8000-000000000001')$$, 'player cannot publish');
SELECT test.denied($$SELECT approve_mcp_grant('client-1', 'x')$$, 'player cannot approve connections');

-- ── GM: approve a connection, review drafts ───────────────────────────────
SELECT test.login(:gm);
SELECT test.eq((SELECT count(*) FROM people WHERE status = 'draft'), 1::BIGINT, 'GM sees drafts');
CREATE TEMP TABLE grant_id ON COMMIT DROP AS SELECT approve_mcp_grant('client-1', 'Claude') AS id;
GRANT SELECT ON grant_id TO authenticated;
SELECT test.eq((SELECT approved_by FROM mcp_grants), :gm::UUID, 'grant records the approving GM');
SELECT test.denied($$UPDATE mcp_grants SET approved_by = '00000000-0000-4000-8000-00000000000b'$$, 'approved_by cannot be changed');

SELECT test.login(:claude);
INSERT INTO mcp_tokens (token_hash, grant_id, kind, expires_at) SELECT 'h1', id, 'refresh', NOW() + INTERVAL '1 day' FROM grant_id;
SELECT test.eq(test.affected($$UPDATE mcp_grants SET last_used_at = NOW()$$), 1, 'assistant marks a grant used');

SELECT test.login(:gm);
SELECT test.eq(test.affected($$UPDATE mcp_grants SET revoked_at = NOW()$$), 1, 'GM revokes a connection');
SELECT test.eq((SELECT count(*) FROM mcp_tokens), 0::BIGINT, 'GM does not see tokens');

SELECT publish_draft('person', :draft);
SELECT test.eq((SELECT status::TEXT || '/' || owner_id FROM people WHERE id = :draft), 'published/' || :gm, 'published draft belongs to the GM');
SELECT test.eq((SELECT owner_id FROM info_boxes WHERE entity_id = :draft), :gm::UUID, 'its info boxes too');
SELECT test.eq((SELECT relationship_type FROM person_relationships WHERE person_id = :gm_person AND related_person_id = :draft), 'siblings', 'reverse relationship added');

SELECT discard_draft('place', 'd0000000-0000-4000-8000-0000000000a1');
SELECT test.eq((SELECT count(*) FROM places WHERE status = 'draft'), 0::BIGINT, 'discarded draft is gone');
DO $$ BEGIN
  PERFORM discard_draft('person', '11111111-1111-4111-8111-111111111111');
  RAISE EXCEPTION 'FAIL discard of a published person was allowed';
EXCEPTION WHEN no_data_found THEN RAISE NOTICE 'ok   published entities cannot be discarded';
END $$;

SELECT test.login(:claude);
SELECT test.eq(test.affected($$UPDATE people SET title = 'x' WHERE id = 'd0000000-0000-4000-8000-000000000001'$$), 0, 'assistant cannot touch it once published');
ROLLBACK;
