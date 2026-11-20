\set ON_ERROR_STOP 1
\set QUIET 1
\set gm '\'00000000-0000-4000-8000-00000000000a\''
\set p1 '\'00000000-0000-4000-8000-00000000000b\''
\set p2 '\'00000000-0000-4000-8000-00000000000c\''
\set claude '\'00000000-0000-4000-8000-00000000000d\''
\echo '017 save project'
BEGIN;

-- ── A player creates a project with its rows in one call ──────────────────
SELECT test.login(:p1);
SELECT save_project(NULL, '{"name": "Schmiede", "benefit": "Waffen", "interval": "Woche"}',
  '[{"description": "Esse", "required_points": 5}, {"description": "Amboss", "required_points": 10}]',
  '[{"skill": "Schmieden", "current_points": 2, "required_points": 20, "threshold": 1}]') AS proj \gset
SELECT test.eq((SELECT owner_id FROM projects WHERE id = :'proj'), :p1::UUID, 'the creator owns the new project');
SELECT test.eq((SELECT string_agg(description || ':' || sort_order, ',' ORDER BY sort_order) FROM project_milestones WHERE project_id = :'proj'),
  'Esse:0,Amboss:1', 'milestones are stored in order');
SELECT test.eq((SELECT current_points FROM project_requirements WHERE project_id = :'proj'), 2, 'requirement is stored');

-- ── Updating replaces the lists that are given, keeps the others ──────────
SELECT test.eq(save_project(:'proj', '{"name": "Große Schmiede", "benefit": "Waffen", "interval": "Woche"}',
  '[{"description": "Esse", "required_points": 6}]', NULL), :'proj'::UUID, 'an update returns the project id');
SELECT test.eq((SELECT name FROM projects WHERE id = :'proj'), 'Große Schmiede', 'project row is updated');
SELECT test.eq((SELECT count(*) FROM project_milestones WHERE project_id = :'proj'), 1::BIGINT, 'milestones are replaced');
SELECT test.eq((SELECT count(*) FROM project_requirements WHERE project_id = :'proj'), 1::BIGINT, 'NULL leaves requirements alone');
SELECT FROM save_project(:'proj', '{"name": "Große Schmiede", "benefit": "Waffen", "interval": "Woche"}', NULL, '[]');
SELECT test.eq((SELECT count(*) FROM project_requirements WHERE project_id = :'proj'), 0::BIGINT, 'an empty array clears requirements');

-- ── A bad row undoes the whole save ───────────────────────────────────────
DO $$ BEGIN
  PERFORM save_project((SELECT id FROM projects WHERE name = 'Große Schmiede'),
    '{"name": "Kaputt", "benefit": "", "interval": ""}',
    '[]', '[{"skill": "Schmieden", "current_points": 0, "required_points": 20}]');
  RAISE EXCEPTION 'FAIL requirement without threshold was allowed';
EXCEPTION WHEN not_null_violation THEN RAISE NOTICE 'ok   requirement without threshold is refused';
END $$;
SELECT test.eq((SELECT name FROM projects WHERE id = :'proj'), 'Große Schmiede', 'failed save leaves the project row');
SELECT test.eq((SELECT count(*) FROM project_milestones WHERE project_id = :'proj'), 1::BIGINT, 'failed save leaves the milestones');

DO $$ BEGIN
  PERFORM save_project(NULL, '{"name": "Halb", "benefit": "", "interval": ""}', '[{"description": "x"}]', NULL);
  RAISE EXCEPTION 'FAIL milestone without points was allowed';
EXCEPTION WHEN not_null_violation THEN RAISE NOTICE 'ok   milestone without points is refused';
END $$;
SELECT test.eq((SELECT count(*) FROM projects WHERE name = 'Halb'), 0::BIGINT, 'failed save creates no project');

-- ── Shared access shows the project but does not allow saving it ──────────
RESET ROLE;
INSERT INTO document_access (entity_type, entity_id, user_id) VALUES ('project', :'proj', :p2);
SELECT test.login(:p2);
SELECT test.eq((SELECT count(*) FROM projects WHERE id = :'proj'), 1::BIGINT, 'shared player sees the project');
SELECT test.denied(format($$SELECT save_project(%L, '{"name": "Meins"}', '[]', '[]')$$, :'proj'), 'shared player cannot save it');
SELECT test.eq((SELECT count(*) FROM project_milestones WHERE project_id = :'proj'), 1::BIGINT, 'refused save leaves the milestones');

-- ── The GM may save any project and does not take it over ─────────────────
SELECT test.login(:gm);
SELECT FROM save_project(:'proj', '{"name": "GM-Schmiede", "benefit": "Waffen", "interval": "Woche"}', '[]', NULL);
SELECT test.eq((SELECT owner_id FROM projects WHERE id = :'proj'), :p1::UUID, 'GM save keeps the owner');
SELECT test.eq((SELECT count(*) FROM project_milestones WHERE project_id = :'proj'), 0::BIGINT, 'GM can clear the milestones');

-- ── Claude and signed-out visitors cannot save ────────────────────────────
SELECT test.login(:claude);
SELECT test.denied(format($$SELECT save_project(%L, '{"name": "Claude"}', NULL, NULL)$$, :'proj'), 'assistant cannot update a project');
SELECT test.denied($$SELECT save_project(NULL, '{"name": "Claude"}', NULL, NULL)$$, 'assistant cannot create a project');
SELECT test.login(NULL);
SELECT test.denied($$SELECT save_project(NULL, '{"name": "Anon"}', NULL, NULL)$$, 'anon cannot call it');
ROLLBACK;
