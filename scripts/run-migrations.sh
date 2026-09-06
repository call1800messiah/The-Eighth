#!/usr/bin/env bash
# =============================================================================
# run-migrations.sh — Run data migrations against a Portainer-managed stack
#
# Usage (from DEPLOY_ROOT, e.g. /opt/the-eighth):
#   bash scripts/run-migrations.sh                # data + storage + validate
#   bash scripts/run-migrations.sh --data-only    # data migration only
#   bash scripts/run-migrations.sh --validate     # validation only
#
# Requires:
#   - .env file with SUPABASE_SERVICE_ROLE_KEY (or SERVICE_ROLE_KEY)
#   - data/export/ directory with Firebase export
#   - The Portainer stack network must be reachable
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

RUN_DATA=true
RUN_STORAGE=true
RUN_VALIDATE=true

for arg in "$@"; do
  case "$arg" in
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

# Resolve the service role key (support both variable names)
SRK="${SERVICE_ROLE_KEY:-${SUPABASE_SERVICE_ROLE_KEY:-}}"
if [ -z "$SRK" ]; then
  error "SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE_KEY must be set in .env"
  exit 1
fi

# Detect the stack network name. Portainer names it <stack>_default.
# Try to find it automatically, fall back to STACK_NETWORK env var.
if [ -z "${STACK_NETWORK:-}" ]; then
  STACK_NETWORK=$(docker network ls --format '{{.Name}}' | grep -E '(the-eighth|theeighth).*default' | head -1 || true)
fi

if [ -z "${STACK_NETWORK:-}" ]; then
  error "Could not detect stack network. Set STACK_NETWORK in .env (e.g. the-eighth_default)"
  exit 1
fi

log "Using network: ${STACK_NETWORK}"

# Common docker run args
DOCKER_RUN="docker run --rm --network ${STACK_NETWORK}"

# ---------------------------------------------------------------------------
# Preflight: sync role passwords + wait for the API to be reachable
# ---------------------------------------------------------------------------

# Re-apply the Supabase service-role passwords so they match POSTGRES_PASSWORD.
# This connects via `docker exec` as the postgres superuser over the local
# socket (peer auth), so it fixes a drifted db-data volume WITHOUT a wipe —
# the very failure mode that surfaces as Kong "name resolution failed".
sync_roles() {
  if [ -z "${POSTGRES_PASSWORD:-}" ]; then
    warn "POSTGRES_PASSWORD not set in .env — skipping role-password sync."
    warn "(Set it to auto-heal stale-volume password mismatches.)"
    return 0
  fi

  local db_container
  db_container=$(docker ps --filter "label=com.docker.compose.service=db" \
    --format '{{.Names}}' | head -1 || true)
  if [ -z "$db_container" ]; then
    warn "Could not find the db container — skipping role-password sync."
    return 0
  fi

  log "Syncing role passwords in ${db_container}..."
  docker exec -i -u postgres "$db_container" \
    psql -v ON_ERROR_STOP=1 -U postgres -d postgres -v pw="$POSTGRES_PASSWORD" <<'SQL'
ALTER ROLE authenticator              WITH PASSWORD :'pw';
ALTER ROLE supabase_auth_admin        WITH PASSWORD :'pw';
ALTER ROLE supabase_storage_admin     WITH PASSWORD :'pw';
ALTER ROLE supabase_replication_admin WITH PASSWORD :'pw';
ALTER ROLE supabase_admin             WITH PASSWORD :'pw';
SQL
  log "Role passwords synced. Restarting dependent services..."
  for svc in rest auth realtime storage meta; do
    local c
    c=$(docker ps -a --filter "label=com.docker.compose.service=${svc}" \
      --format '{{.Names}}' | head -1 || true)
    [ -n "$c" ] && docker restart "$c" >/dev/null 2>&1 || true
  done
}

# Poll the REST API through Kong until an upstream is actually reachable.
# A 5xx (specifically Kong's 503 "name resolution failed") means rest/auth
# aren't up yet; anything 2xx–4xx means the chain is live.
wait_for_rest() {
  local timeout="${1:-150}" elapsed=0 code
  log "Waiting for REST API via Kong (timeout: ${timeout}s)..."
  while [ "$elapsed" -lt "$timeout" ]; do
    code=$($DOCKER_RUN curlimages/curl:latest -s -o /dev/null -w '%{http_code}' \
      -H "apikey: ${SRK}" -H "Authorization: Bearer ${SRK}" \
      "http://kong:8000/rest/v1/" 2>/dev/null || echo "000")
    if [ "$code" -ge 200 ] 2>/dev/null && [ "$code" -lt 500 ]; then
      log "REST API reachable (HTTP ${code})."
      return 0
    fi
    sleep 3
    elapsed=$((elapsed + 3))
  done
  error "REST API not reachable through Kong within ${timeout}s (last HTTP: ${code:-none})."
  error "Backend containers are likely crash-looping. Check: docker ps -a"
  error "and the logs: docker logs \$(docker ps -aqf name=rest) --tail 40"
  return 1
}

sync_roles
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
    -e SUPABASE_URL=http://kong:8000 \
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
      -e SUPABASE_URL=http://kong:8000 \
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
    -e SUPABASE_URL=http://kong:8000 \
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
