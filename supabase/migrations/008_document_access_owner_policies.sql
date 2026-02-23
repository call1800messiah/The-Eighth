-- Fix document_access policies to allow entity owners to manage access.
--
-- Previously, non-GM entity owners could not see, insert, or delete access
-- grants for their own entities. Only GMs could. This meant:
--   - The EditAccess popover showed incorrect state for non-GM owners
--   - Non-GM owners couldn't share their own entities
--   - The access indicator tooltip only showed GMs (owner never saw other grants)
--
-- Fix: Allow entity owners to fully manage document_access entries for their
-- own entities, in addition to GMs.

-- Helper function to check if the current user owns an entity
CREATE OR REPLACE FUNCTION is_entity_owner(p_entity_type TEXT, p_entity_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
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
    ELSE RETURN FALSE;
  END CASE;
  RETURN v_owner_id IS NOT NULL AND v_owner_id = auth.uid();
END;
$$;

-- Fix SELECT: users see their own grants, entity owners see all grants for
-- their entities, GMs see everything
DROP POLICY IF EXISTS document_access_select_policy ON document_access;
CREATE POLICY document_access_select_policy ON document_access
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    is_gm() OR
    is_entity_owner(entity_type, entity_id)
  );

-- Fix INSERT: entity owners and GMs can grant access
DROP POLICY IF EXISTS document_access_insert_policy ON document_access;
CREATE POLICY document_access_insert_policy ON document_access
  FOR INSERT
  WITH CHECK (
    is_gm() OR
    is_entity_owner(entity_type, entity_id)
  );

-- Fix DELETE: entity owners and GMs can revoke access
DROP POLICY IF EXISTS document_access_delete_policy ON document_access;
CREATE POLICY document_access_delete_policy ON document_access
  FOR DELETE
  USING (
    is_gm() OR
    is_entity_owner(entity_type, entity_id)
  );
