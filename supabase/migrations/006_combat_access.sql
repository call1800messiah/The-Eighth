-- Fix combat write policies to allow all authenticated users.
--
-- Combat is a shared collaborative space — all campaign members need to be
-- able to add/remove combatants and update their state during a session.
-- The original GM-only write policies were too restrictive.

-- Combatants
DROP POLICY IF EXISTS combatants_insert_policy ON combatants;
DROP POLICY IF EXISTS combatants_update_policy ON combatants;
DROP POLICY IF EXISTS combatants_delete_policy ON combatants;

CREATE POLICY combatants_insert_policy ON combatants
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY combatants_update_policy ON combatants
  FOR UPDATE USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY combatants_delete_policy ON combatants
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Combatant attributes
DROP POLICY IF EXISTS combatant_attributes_insert_policy ON combatant_attributes;
DROP POLICY IF EXISTS combatant_attributes_update_policy ON combatant_attributes;
DROP POLICY IF EXISTS combatant_attributes_delete_policy ON combatant_attributes;

CREATE POLICY combatant_attributes_insert_policy ON combatant_attributes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY combatant_attributes_update_policy ON combatant_attributes
  FOR UPDATE USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY combatant_attributes_delete_policy ON combatant_attributes
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Combatant states
DROP POLICY IF EXISTS combatant_states_insert_policy ON combatant_states;
DROP POLICY IF EXISTS combatant_states_update_policy ON combatant_states;
DROP POLICY IF EXISTS combatant_states_delete_policy ON combatant_states;

CREATE POLICY combatant_states_insert_policy ON combatant_states
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY combatant_states_update_policy ON combatant_states
  FOR UPDATE USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY combatant_states_delete_policy ON combatant_states
  FOR DELETE USING (auth.uid() IS NOT NULL);
