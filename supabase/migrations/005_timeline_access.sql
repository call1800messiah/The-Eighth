-- ============================================================================
-- Migration 005: Fix timeline access policies
--
-- Timelines and historic_events are campaign-wide shared resources.
-- In the original Firebase data, timelines had no owner or access arrays,
-- meaning all campaign members could read them. The initial RLS policies
-- modeled timelines like per-user entities, blocking non-GM access.
--
-- Fix: Allow any authenticated user to read timelines and their events,
-- matching the same pattern as the campaign table (USING true).
-- Write operations remain restricted to owners and GMs.
-- ============================================================================

-- Fix timelines select policy
DROP POLICY IF EXISTS timelines_select_policy ON timelines;
CREATE POLICY timelines_select_policy ON timelines
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Fix historic_events select policy: per-user access like other entities
DROP POLICY IF EXISTS historic_events_select_policy ON historic_events;
CREATE POLICY historic_events_select_policy ON historic_events
  FOR SELECT
  USING (
    owner_id = auth.uid() OR
    is_gm() OR
    EXISTS (
      SELECT 1 FROM document_access
      WHERE entity_type = 'historic_event'
      AND entity_id = historic_events.id
      AND user_id = auth.uid()
    )
  );
