-- ============================================================================
-- 017: save a project and its milestones and requirements in one transaction
-- ============================================================================
--
-- The client used to write the project row and then each junction table with
-- separate requests. A failure in between left half a save behind (a project
-- without its rows, or old and new rows side by side), and two overlapping
-- saves could delete each other's rows. save_project() does it all at once.
--
-- SECURITY INVOKER: every statement runs under the caller's RLS, so who may
-- save what is still decided by the policies in 002 (and the assistant's
-- RESTRICTIVE ones in 013). The UPDATE also locks the project row, which makes
-- concurrent saves of one project run one after the other.

CREATE OR REPLACE FUNCTION save_project(
  p_id UUID,
  p_project JSONB,
  p_milestones JSONB DEFAULT NULL,
  p_requirements JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id UUID := p_id;
BEGIN
  IF v_id IS NULL THEN
    INSERT INTO projects (name, benefit, interval, owner_id)
    VALUES (p_project->>'name', p_project->>'benefit', p_project->>'interval', auth.uid())
    RETURNING id INTO v_id;
  ELSE
    UPDATE projects
    SET name = p_project->>'name',
        benefit = p_project->>'benefit',
        interval = p_project->>'interval'
    WHERE id = v_id;
    -- RLS hides a project the caller may not change instead of failing.
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Project % does not exist or may not be changed', v_id
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;

  -- NULL leaves a list as it is; an empty array clears it.
  IF p_milestones IS NOT NULL THEN
    DELETE FROM project_milestones WHERE project_id = v_id;
    INSERT INTO project_milestones (project_id, description, required_points, sort_order)
    SELECT v_id, m->>'description', (m->>'required_points')::INTEGER, (ord - 1)::INTEGER
    FROM jsonb_array_elements(p_milestones) WITH ORDINALITY AS t(m, ord);
  END IF;

  IF p_requirements IS NOT NULL THEN
    DELETE FROM project_requirements WHERE project_id = v_id;
    INSERT INTO project_requirements (project_id, skill, current_points, required_points, threshold, sort_order)
    SELECT v_id, r->>'skill', (r->>'current_points')::INTEGER, (r->>'required_points')::INTEGER,
           (r->>'threshold')::INTEGER, (ord - 1)::INTEGER
    FROM jsonb_array_elements(p_requirements) WITH ORDINALITY AS t(r, ord);
  END IF;

  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION save_project(UUID, JSONB, JSONB, JSONB) IS
  'Creates (p_id NULL) or updates a project and replaces its milestones and requirements, all or nothing. Returns the project id.';

REVOKE ALL ON FUNCTION save_project(UUID, JSONB, JSONB, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION save_project(UUID, JSONB, JSONB, JSONB) TO authenticated;
