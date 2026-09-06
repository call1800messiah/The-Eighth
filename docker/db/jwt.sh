#!/bin/bash
# Configure JWT settings in the database.
# PostgREST and GoTrue read these via app.settings GUCs.
#
# The secret is passed as a psql variable and interpolated with :'jwt_secret',
# which quotes it as a SQL string literal. Never interpolate it into an
# unquoted heredoc: a secret containing a single quote would break out of the
# literal and execute arbitrary SQL as the postgres superuser.

set -e

: "${JWT_SECRET:?JWT_SECRET must be set}"

psql -v ON_ERROR_STOP=1 --username postgres --dbname postgres \
  -v jwt_secret="${JWT_SECRET}" -v jwt_exp="${JWT_EXP:-3600}" <<'EOSQL'
ALTER DATABASE postgres SET "app.settings.jwt_secret" TO :'jwt_secret';
ALTER DATABASE postgres SET "app.settings.jwt_exp" TO :'jwt_exp';
EOSQL
