#!/usr/bin/env bash
# Runs the RLS / trigger tests in supabase/tests against a throwaway local
# Postgres (no Docker, no Supabase): initdb into a temp dir, apply shim.sql
# and the migrations, then each *.test.sql in its own rolled-back transaction.
#
#   bash supabase/tests/run.sh             # all tests
#   bash supabase/tests/run.sh 013         # tests whose name starts with 013
#   KEEP=1 bash supabase/tests/run.sh      # leave the server running (prints how to reach it)
#   PGTEST_DIR=/some/dir KEEP=1 ...        # put it there (the socket is in that directory)
#
# Needs the Postgres server binaries (initdb, pg_ctl); set PG_BIN if they are
# not on PATH, e.g. PG_BIN=/usr/lib/postgresql/16/bin.
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$DIR/../.." && pwd)"
PG_BIN="${PG_BIN:-$(dirname "$(command -v initdb 2>/dev/null || ls /usr/lib/postgresql/*/bin/initdb 2>/dev/null | tail -1)")}"
PORT="${PGTEST_PORT:-55440}"
FILTER="${1:-}"

[ -x "$PG_BIN/initdb" ] || { echo "initdb not found; set PG_BIN" >&2; exit 1; }

WORK="${PGTEST_DIR:-$(mktemp -d)}"
mkdir -p "$WORK"
as_pg() { if [ "$(id -u)" = 0 ]; then runuser -u postgres -- "$@"; else "$@"; fi; }
[ "$(id -u)" = 0 ] && chown postgres "$WORK"

cleanup() {
  if [ -z "${KEEP:-}" ]; then
    as_pg "$PG_BIN/pg_ctl" -D "$WORK/data" stop -m immediate >/dev/null 2>&1 || true
    rm -rf "$WORK"
  fi
}
trap cleanup EXIT

as_pg "$PG_BIN/initdb" -D "$WORK/data" -A trust -U postgres >/dev/null
as_pg "$PG_BIN/pg_ctl" -D "$WORK/data" -o "-p $PORT -k $WORK -c listen_addresses=''" -l "$WORK/log" start >/dev/null

PSQL=(psql -h "$WORK" -p "$PORT" -U postgres -d postgres -X -q -t -v ON_ERROR_STOP=1)

"${PSQL[@]}" -f "$DIR/shim.sql" 2>&1 | grep -v "wal_level\|logical changes\|before creating subscriptions" || true

# Like scripts/run-migrations.sh: plain psql -f, one statement at a time.
for f in "$ROOT"/supabase/migrations/*.sql; do
  if ! out="$("${PSQL[@]}" -f "$f" 2>&1)"; then
    echo "Migration $(basename "$f") failed:" >&2
    echo "$out" >&2
    exit 1
  fi
done

"${PSQL[@]}" -f "$DIR/fixtures.sql"

status=0
for t in "$DIR"/${FILTER}*.test.sql; do
  [ -e "$t" ] || continue
  if out="$("${PSQL[@]}" -f "$t" 2>&1)"; then rc=0; else rc=$?; fi
  echo "$out" | sed -e 's/^psql:[^ ]* NOTICE:  /  /' -e 's/^NOTICE:  /  /' | grep -v '^\s*$' || true
  [ "$rc" = 0 ] || status=1
done

if [ -n "${KEEP:-}" ]; then
  echo "Server left running: psql -h $WORK -p $PORT -U postgres"
fi
exit $status
