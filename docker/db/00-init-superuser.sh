#!/bin/bash
# =============================================================================
# 00-init-superuser.sh — Ensure the `postgres` superuser role exists
#
# The supabase/postgres image bootstraps its superuser as `supabase_admin`,
# NOT `postgres`. But the other init scripts (99-jwt.sh, 99-roles.sh), the
# healthcheck (pg_isready -U postgres), and the migration tooling all connect
# as `postgres`. Without this role they fail on the very first init script,
# which aborts the whole initdb run and leaves a half-built cluster.
#
# This script runs first (00- sorts before 99-) and creates `postgres` as a
# superuser if it's missing. It connects over the local trust socket as
# whichever bootstrap superuser actually exists.
# =============================================================================

set -e

# Find a superuser we can connect as. supabase_admin is the image default;
# fall back to whatever the entrypoint set, then to postgres itself.
SUPERUSER=""
for candidate in supabase_admin "${POSTGRES_USER:-}" postgres; do
  [ -z "$candidate" ] && continue
  if psql -U "$candidate" -d postgres -tAc 'SELECT 1' >/dev/null 2>&1; then
    SUPERUSER="$candidate"
    break
  fi
done
: "${SUPERUSER:?[00-init-superuser] could not connect as any known superuser}"

echo "[00-init-superuser] Ensuring 'postgres' role exists (via ${SUPERUSER})..."

psql -v ON_ERROR_STOP=1 -U "$SUPERUSER" -d postgres -v pw="${POSTGRES_PASSWORD}" <<'EOSQL'
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
    CREATE ROLE postgres
      SUPERUSER CREATEDB CREATEROLE REPLICATION BYPASSRLS LOGIN;
  END IF;
END
$do$;
ALTER ROLE postgres WITH PASSWORD :'pw';
EOSQL

echo "[00-init-superuser] Done."
