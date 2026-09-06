#!/bin/sh
# =============================================================================
# init-roles.sh — Idempotent role-password sync (runs on EVERY deploy)
#
# Unlike docker/db/roles.sh (which runs only once, via the Postgres
# docker-entrypoint-initdb.d hook on an empty data volume), this script runs
# on every stack deploy as the `db-init` service. It guarantees the Supabase
# service roles always carry the current POSTGRES_PASSWORD, which prevents the
# "password authentication failed" crash-loops that otherwise occur whenever
# POSTGRES_PASSWORD changes after the volume was first initialized.
#
# Connects over TCP to the db service as the `postgres` superuser. The
# `:'pw'` psql substitution quotes the value as a SQL string literal, so
# passwords containing special characters are handled safely.
# =============================================================================

set -e

: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD must be set}"
export PGPASSWORD="$POSTGRES_PASSWORD"

DB_HOST="${DB_HOST:-db}"
DB_PORT="${DB_PORT:-5432}"

echo "[db-init] Syncing role passwords on ${DB_HOST}:${DB_PORT}..."

psql -v ON_ERROR_STOP=1 -h "$DB_HOST" -p "$DB_PORT" -U postgres -d postgres \
  -v pw="$POSTGRES_PASSWORD" <<'SQL'
ALTER ROLE authenticator              WITH PASSWORD :'pw';
ALTER ROLE supabase_auth_admin        WITH PASSWORD :'pw';
ALTER ROLE supabase_storage_admin     WITH PASSWORD :'pw';
ALTER ROLE supabase_replication_admin WITH PASSWORD :'pw';
ALTER ROLE supabase_admin             WITH PASSWORD :'pw';
SQL

echo "[db-init] Role passwords synced."
