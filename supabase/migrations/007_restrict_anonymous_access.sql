-- Close what the anon role could still read, and pin search_path on the
-- SECURITY DEFINER helpers.
--
-- The app is reachable from the internet, and the anon key is part of the
-- public JS bundle, so anyone can call PostgREST and Storage without logging
-- in. A policy without a TO clause applies to anon as well, and these ones
-- are USING (true): campaign, combat and rules data was readable by anyone,
-- and anyone could list every object in the storage bucket. Only
-- users/user_roles were already scoped.
--
-- Every read of these tables happens behind AuthGuardService, so restricting
-- them to authenticated changes nothing for players. Storage images keep
-- working: the bucket is public, and /object/public/ URLs are served without
-- consulting RLS. Only listing and the authenticated download path go through
-- this policy.
--
-- ALTER POLICY keeps each USING clause as it is and is safe to re-run.

ALTER POLICY campaign_select_policy ON campaign TO authenticated;
ALTER POLICY combat_sessions_select_policy ON combat_sessions TO authenticated;
ALTER POLICY rules_select_policy ON rules TO authenticated;
ALTER POLICY allowed_attributes_select_policy ON allowed_attributes TO authenticated;
ALTER POLICY hit_locations_select_policy ON hit_locations TO authenticated;
ALTER POLICY combat_states_select_policy ON combat_states TO authenticated;
ALTER POLICY rules_config_select_policy ON rules_config TO authenticated;
ALTER POLICY combatants_select_policy ON combatants TO authenticated;
ALTER POLICY combatant_attributes_select_policy ON combatant_attributes TO authenticated;
ALTER POLICY combatant_states_select_policy ON combatant_states TO authenticated;

ALTER POLICY "Public read access" ON storage.objects TO authenticated;

-- A SECURITY DEFINER function runs with its owner's rights but resolves
-- unqualified names through the caller's search_path, so a caller who can
-- put an object earlier on that path can substitute their own `user_roles`
-- or `people`. Pinning the path removes that; pg_temp goes last so a
-- temporary table cannot shadow anything either.
ALTER FUNCTION public.current_user_id() SET search_path = public, pg_temp;
ALTER FUNCTION public.is_gm() SET search_path = public, pg_temp;
ALTER FUNCTION public.is_entity_owner(TEXT, UUID) SET search_path = public, pg_temp;
