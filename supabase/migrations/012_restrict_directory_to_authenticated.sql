-- ============================================================================
-- Restrict the user directory to authenticated sessions
--
-- users_select_policy and user_roles_select_policy were created as
-- USING (true) with no role qualifier, so they applied to the `anon` role as
-- well. Combined with a gateway that did not require an API key, that made
-- GET /rest/v1/users and /rest/v1/user_roles readable by anyone who could
-- reach the deployment - leaking every player's display name and revealing
-- which accounts hold the GM role.
--
-- The app only reads these tables from behind the auth guard (UserService is
-- resolved lazily by feature modules), so scoping them to `authenticated`
-- changes no client behaviour. service_role is unaffected: it has BYPASSRLS.
-- ============================================================================

DROP POLICY IF EXISTS users_select_policy ON users;

CREATE POLICY users_select_policy ON users
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS user_roles_select_policy ON user_roles;

CREATE POLICY user_roles_select_policy ON user_roles
  FOR SELECT
  TO authenticated
  USING (true);
