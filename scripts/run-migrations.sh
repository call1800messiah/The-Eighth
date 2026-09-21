#!/usr/bin/env bash
# =============================================================================
# run-migrations.sh — Run migrations against a separately-run Supabase instance
#
# Usage (from DEPLOY_ROOT, e.g. /opt/the-eighth):
#   bash scripts/run-migrations.sh                # data + storage + validate
#   bash scripts/run-migrations.sh --data-only    # data migration only
#   bash scripts/run-migrations.sh --validate     # validation only
#   bash scripts/run-migrations.sh --schema       # apply supabase/migrations/*.sql only
#
# Requires:
#   - .env file with SUPABASE_URL and SERVICE_ROLE_KEY (or SUPABASE_SERVICE_ROLE_KEY)
#   - data/export/ directory with Firebase export (for --data-only / default)
#   - SUPABASE_DB_URL set in .env (for --schema), e.g.
#     postgres://postgres:PASSWORD@supabase-host:5432/postgres
#   - The host running this script must be able to reach SUPABASE_URL
#     (and SUPABASE_DB_URL for --schema) - Supabase is not managed by this repo
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()   { echo -e "${GREEN}[migrate]${NC} $*"; }
warn()  { echo -e "${YELLOW}[migrate]${NC} $*"; }
error() { echo -e "${RED}[migrate]${NC} $*" >&2; }

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------

RUN_SCHEMA=false
RUN_DATA=true
RUN_STORAGE=true
RUN_VALIDATE=true

for arg in "$@"; do
  case "$arg" in
    --schema)       RUN_SCHEMA=true; RUN_DATA=false; RUN_STORAGE=false; RUN_VALIDATE=false ;;
    --data-only)    RUN_STORAGE=false; RUN_VALIDATE=false ;;
    --validate)     RUN_DATA=false; RUN_STORAGE=false ;;
    --no-storage)   RUN_STORAGE=false ;;
    *) warn "Unknown argument: $arg" ;;
  esac
done

# ---------------------------------------------------------------------------
# Pre-flight checks
# ---------------------------------------------------------------------------

if [ ! -f ".env" ]; then
  error ".env file not found."
  exit 1
fi

set -a
source .env
set +a

if [ -z "${SUPABASE_URL:-}" ]; then
  error "SUPABASE_URL must be set in .env (the external Supabase instance's API gateway URL)"
  exit 1
fi

# Resolve the service role key (support both variable names)
SRK="${SERVICE_ROLE_KEY:-${SUPABASE_SERVICE_ROLE_KEY:-}}"
if [ -z "$SRK" ] && [ "$RUN_SCHEMA" = false ]; then
  error "SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE_KEY must be set in .env"
  exit 1
fi

# Migration containers reach SUPABASE_URL (and SUPABASE_DB_URL) as a plain
# HTTP/Postgres endpoint - host networking keeps this working whether that
# URL points at localhost, a LAN IP, or a public domain.
DOCKER_RUN="docker run --rm --network host"

# ---------------------------------------------------------------------------
# Schema migrations (one-time bootstrap of a fresh Supabase instance)
# ---------------------------------------------------------------------------

run_schema() {
  if [ -z "${SUPABASE_DB_URL:-}" ]; then
    error "SUPABASE_DB_URL must be set in .env to apply schema migrations"
    error "e.g. postgres://postgres:PASSWORD@supabase-host:5432/postgres"
    exit 1
  fi

  # These migrations assume a Supabase-flavored Postgres (auth/storage
  # schemas, authenticated/anon roles, etc. already provisioned) - the
  # target must be a real Supabase instance, not vanilla postgres.

  log "Applying supabase/migrations/*.sql to ${SUPABASE_DB_URL%%@*}@..."
  for f in "$PROJECT_DIR"/supabase/migrations/*.sql; do
    log "  $(basename "$f")"
    $DOCKER_RUN \
      -v "$f":/migration.sql:ro \
      postgres:17-alpine \
      psql -v ON_ERROR_STOP=1 "$SUPABASE_DB_URL" -f /migration.sql
  done
  log "Schema migrations applied."
}

# Poll the REST API until an upstream is actually reachable.
wait_for_rest() {
  local timeout="${1:-150}" elapsed=0 code
  log "Waiting for REST API at ${SUPABASE_URL} (timeout: ${timeout}s)..."
  while [ "$elapsed" -lt "$timeout" ]; do
    code=$($DOCKER_RUN curlimages/curl:latest -s -o /dev/null -w '%{http_code}' \
      -H "apikey: ${SRK}" -H "Authorization: Bearer ${SRK}" \
      "${SUPABASE_URL}/rest/v1/" 2>/dev/null || echo "000")
    if [ "$code" -ge 200 ] 2>/dev/null && [ "$code" -lt 500 ]; then
      log "REST API reachable (HTTP ${code})."
      return 0
    fi
    sleep 3
    elapsed=$((elapsed + 3))
  done
  error "REST API not reachable at ${SUPABASE_URL} within ${timeout}s (last HTTP: ${code:-none})."
  error "Check that the Supabase instance is running and reachable from this host."
  return 1
}

if [ "$RUN_SCHEMA" = true ]; then
  run_schema
  echo ""
  log "All done."
  exit 0
fi

wait_for_rest

# ---------------------------------------------------------------------------
# Data migration
# ---------------------------------------------------------------------------

if [ "$RUN_DATA" = true ]; then
  if [ ! -d "data/export" ]; then
    error "data/export/ directory not found."
    exit 1
  fi

  log "Running data migration..."
  $DOCKER_RUN \
    -e SUPABASE_URL="${SUPABASE_URL}" \
    -e SUPABASE_SERVICE_ROLE_KEY="$SRK" \
    -v "$PROJECT_DIR/scripts":/app/scripts:ro \
    -v "$PROJECT_DIR/data":/app/data \
    -v "$PROJECT_DIR/src/assets":/app/src/assets:ro \
    -v "$PROJECT_DIR/package.json":/app/package.json:ro \
    -v "$PROJECT_DIR/package-lock.json":/app/package-lock.json:ro \
    -v "$PROJECT_DIR/tsconfig.json":/app/tsconfig.json:ro \
    -w /app \
    node:20-alpine sh -c "npm ci --ignore-scripts && npx tsx scripts/transform-and-migrate.ts"

  log "Data migration complete."
fi

# ---------------------------------------------------------------------------
# Storage migration
# ---------------------------------------------------------------------------

if [ "$RUN_STORAGE" = true ]; then
  if [ ! -f "firebase-service-account.json" ]; then
    warn "Skipping storage migration (firebase-service-account.json not found)"
  else
    log "Running storage migration..."
    $DOCKER_RUN \
      -e SUPABASE_URL="${SUPABASE_URL}" \
      -e SUPABASE_SERVICE_ROLE_KEY="$SRK" \
      -v "$PROJECT_DIR/scripts":/app/scripts:ro \
      -v "$PROJECT_DIR/data/export":/app/data/export:ro \
      -v "$PROJECT_DIR/firebase-service-account.json":/app/firebase-service-account.json:ro \
      -v "$PROJECT_DIR/package.json":/app/package.json:ro \
      -v "$PROJECT_DIR/package-lock.json":/app/package-lock.json:ro \
      -v "$PROJECT_DIR/tsconfig.json":/app/tsconfig.json:ro \
      -w /app \
      node:20-alpine sh -c "npm ci --ignore-scripts && npx tsx scripts/migrate-storage.ts"

    log "Storage migration complete."
  fi
fi

# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

if [ "$RUN_VALIDATE" = true ]; then
  log "Running post-migration validation..."
  $DOCKER_RUN \
    -e SUPABASE_URL="${SUPABASE_URL}" \
    -e SUPABASE_SERVICE_ROLE_KEY="$SRK" \
    -v "$PROJECT_DIR/scripts":/app/scripts:ro \
    -v "$PROJECT_DIR/data/export":/app/data/export:ro \
    -v "$PROJECT_DIR/package.json":/app/package.json:ro \
    -v "$PROJECT_DIR/package-lock.json":/app/package-lock.json:ro \
    -v "$PROJECT_DIR/tsconfig.json":/app/tsconfig.json:ro \
    -w /app \
    node:20-alpine sh -c "npm ci --ignore-scripts && npx tsx scripts/validate-migration.ts"

  log "Validation complete."
fi

echo ""
log "All done."
