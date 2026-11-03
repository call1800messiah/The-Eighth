#!/usr/bin/env bash
# Runs the tool tests against the real thing: a throwaway Postgres with every
# migration (see supabase/tests/run.sh) behind a real PostgREST, with requests
# signed as the fixture users. So RLS, triggers and functions are all live.
#
#   bash mcp/test/integration.sh
#
# Downloads PostgREST into the temp dir unless POSTGREST_BIN points at one.
set -euo pipefail

MCP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROOT="$(cd "$MCP_DIR/.." && pwd)"
WORK="$(mktemp -d)"
chmod 755 "$WORK"
PG_PORT="${PGTEST_PORT:-55440}"
REST_PORT="${POSTGREST_PORT:-55441}"
JWT_SECRET="$(head -c 48 /dev/urandom | base64 | tr -d '/+=\n')"
REST_PID=""

cleanup() {
  [ -n "$REST_PID" ] && kill "$REST_PID" 2>/dev/null || true
  PG_BIN="${PG_BIN:-$(dirname "$(command -v initdb 2>/dev/null || ls /usr/lib/postgresql/*/bin/initdb 2>/dev/null | tail -1)")}"
  if [ "$(id -u)" = 0 ]; then
    runuser -u postgres -- "$PG_BIN/pg_ctl" -D "$WORK/pg/data" stop -m immediate >/dev/null 2>&1 || true
  else
    "$PG_BIN/pg_ctl" -D "$WORK/pg/data" stop -m immediate >/dev/null 2>&1 || true
  fi
  rm -rf "$WORK"
}
trap cleanup EXIT

echo "Starting Postgres with all migrations..."
PGTEST_DIR="$WORK/pg" PGTEST_PORT="$PG_PORT" KEEP=1 bash "$ROOT/supabase/tests/run.sh" __no_db_tests__ >/dev/null

POSTGREST="${POSTGREST_BIN:-}"
if [ -z "$POSTGREST" ]; then
  echo "Downloading PostgREST..."
  curl -sSfL -o "$WORK/postgrest.tar.xz" \
    https://github.com/PostgREST/postgrest/releases/download/v12.2.12/postgrest-v12.2.12-linux-static-x86-64.tar.xz
  tar -xJf "$WORK/postgrest.tar.xz" -C "$WORK"
  POSTGREST="$WORK/postgrest"
fi

cat > "$WORK/postgrest.conf" <<CONF
db-uri = "postgres://authenticator@/postgres?host=$WORK/pg&port=$PG_PORT"
db-schemas = "public"
db-anon-role = "anon"
jwt-secret = "$JWT_SECRET"
server-host = "127.0.0.1"
server-port = $REST_PORT
log-level = "error"
CONF

"$POSTGREST" "$WORK/postgrest.conf" &
REST_PID=$!
for _ in $(seq 1 50); do
  curl -sf "http://127.0.0.1:$REST_PORT/" >/dev/null 2>&1 && break
  sleep 0.2
done

cd "$MCP_DIR"
TEST_POSTGREST_URL="http://127.0.0.1:$REST_PORT" TEST_JWT_SECRET="$JWT_SECRET" \
  node --import tsx --test test/tools.integration.test.ts
