#!/bin/bash
# Configure role passwords for Supabase services.
# Uses a shell script (not .sql) so $POSTGRES_PASSWORD reaches psql reliably
# in the supabase/postgres entrypoint.
#
# The password is passed as a psql variable and interpolated with :'pw', which
# quotes it as a SQL string literal. Never interpolate it into an unquoted
# heredoc: a password containing a single quote would break out of the literal
# and execute arbitrary SQL as the postgres superuser.

set -e

: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD must be set}"

psql -v ON_ERROR_STOP=1 --username postgres --dbname postgres \
  -v pw="${POSTGRES_PASSWORD}" <<'EOSQL'
ALTER ROLE authenticator WITH PASSWORD :'pw';
ALTER ROLE supabase_auth_admin WITH PASSWORD :'pw';
ALTER ROLE supabase_storage_admin WITH PASSWORD :'pw';
ALTER ROLE supabase_replication_admin WITH PASSWORD :'pw';
EOSQL
