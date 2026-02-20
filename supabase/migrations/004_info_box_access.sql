-- Add per-info-box access control via document_access.
--
-- Previously, info_boxes visibility was derived solely from the parent entity
-- (person/place/quest). In Firebase, each info doc had its own access[] array,
-- so info boxes need their own document_access entries with entity_type = 'info_box'.

-- Drop and recreate the select policy to also check per-info-box document_access
DROP POLICY IF EXISTS info_boxes_select_policy ON info_boxes;

CREATE POLICY info_boxes_select_policy ON info_boxes
  FOR SELECT USING (
    owner_id = auth.uid() OR
    is_gm() OR
    -- Per-info-box access
    EXISTS (SELECT 1 FROM document_access WHERE entity_type = 'info_box' AND entity_id = info_boxes.id AND user_id = auth.uid()) OR
    -- Fallback: parent entity access (for backwards compatibility)
    (entity_type = 'person' AND EXISTS (SELECT 1 FROM people WHERE id = entity_id AND (owner_id = auth.uid() OR EXISTS (SELECT 1 FROM document_access WHERE entity_type = 'person' AND entity_id = info_boxes.entity_id AND user_id = auth.uid())))) OR
    (entity_type = 'place' AND EXISTS (SELECT 1 FROM places WHERE id = entity_id AND (owner_id = auth.uid() OR EXISTS (SELECT 1 FROM document_access WHERE entity_type = 'place' AND entity_id = info_boxes.entity_id AND user_id = auth.uid())))) OR
    (entity_type = 'quest' AND EXISTS (SELECT 1 FROM quests WHERE id = entity_id AND (owner_id = auth.uid() OR EXISTS (SELECT 1 FROM document_access WHERE entity_type = 'quest' AND entity_id = info_boxes.entity_id AND user_id = auth.uid()))))
  );
