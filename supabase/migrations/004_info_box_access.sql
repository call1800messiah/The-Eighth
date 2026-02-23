-- Add per-info-box access control via document_access.
--
-- Previously, info_boxes visibility was derived solely from the parent entity
-- (person/place/quest). In Firebase, each info doc had its own access[] array,
-- so info boxes need their own document_access entries with entity_type = 'info_box'.
--
-- The fallback parent entity access clause was removed because it caused all infos
-- of an entity to be visible to anyone with access to the parent entity, defeating
-- the purpose of per-info-box access control.

-- Drop and recreate the select policy to use only per-info-box document_access
DROP POLICY IF EXISTS info_boxes_select_policy ON info_boxes;

CREATE POLICY info_boxes_select_policy ON info_boxes
  FOR SELECT USING (
    owner_id = auth.uid() OR
    is_gm() OR
    EXISTS (
      SELECT 1 FROM document_access
      WHERE entity_type = 'info_box'
      AND entity_id = info_boxes.id
      AND user_id = auth.uid()
    )
  );
