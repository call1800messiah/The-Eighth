#!/usr/bin/env bash
# =============================================================================
# deploy.sh — Server-side deployment orchestrator
#
# Supabase is NOT bundled in this repo's docker-compose.yml - it runs as a
# separately-managed instance that this app points at via SUPABASE_URL.
#
# Usage:
#   bash scripts/deploy.sh           # Normal deploy (skip schema migration)
#   bash scripts/deploy.sh --fresh   # Also apply supabase/migrations/*.sql
#                                     # first (for a brand-new Supabase instance)
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
NC='\033[0m' # No Color

log()   { echo -e "${GREEN}[deploy]${NC} $*"; }
warn()  { echo -e "${YELLOW}[deploy]${NC} $*"; }
error() { echo -e "${RED}[deploy]${NC} $*" >&2; }

# Poll the external Supabase instance's REST API until it's actually reachable.
wait_for_rest() {
  local timeout="${1:-60}" elapsed=0 code
  log "Waiting for Supabase REST API at ${SUPABASE_URL} (timeout: ${timeout}s)..."
  while [ "$elapsed" -lt "$timeout" ]; do
    code=$(docker run --rm --network host curlimages/curl:latest -s -o /dev/null -w '%{http_code}' \
      -H "apikey: ${ANON_KEY:-}" \
      "${SUPABASE_URL}/rest/v1/" 2>/dev/null || echo "000")
    if [ "$code" -ge 200 ] 2>/dev/null && [ "$code" -lt 500 ]; then
      log "Supabase reachable (HTTP ${code})."
      return 0
    fi
    sleep 2
    elapsed=$((elapsed + 2))
  done
  error "Supabase not reachable at ${SUPABASE_URL} within ${timeout}s (last HTTP: ${code:-none})."
  error "Check that the Supabase instance is running and reachable from this host."
  return 1
}

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------

FRESH=false
for arg in "$@"; do
  case "$arg" in
    --fresh) FRESH=true ;;
    *) warn "Unknown argument: $arg" ;;
  esac
done

# ---------------------------------------------------------------------------
# Pre-flight checks
# ---------------------------------------------------------------------------

if [ ! -f ".env" ]; then
  error ".env file not found. Copy docker/.env.example to .env and configure it."
  exit 1
fi

# Source .env for variable access
set -a
source .env
set +a

if [ -z "${SUPABASE_URL:-}" ]; then
  error "SUPABASE_URL must be set in .env (the external Supabase instance's API gateway URL)"
  exit 1
fi

if [ ! -d "data/export" ]; then
  error "data/export/ directory not found. Export Firebase data first."
  exit 1
fi

# ---------------------------------------------------------------------------
# Fresh deploy: bootstrap schema on a brand-new Supabase instance
# ---------------------------------------------------------------------------

if [ "$FRESH" = true ]; then
  warn "Fresh deploy requested — applying schema migrations first..."
  bash "$SCRIPT_DIR/run-migrations.sh" --schema
fi

# ---------------------------------------------------------------------------
# Wait for Supabase to be reachable
# ---------------------------------------------------------------------------

wait_for_rest 60

# ---------------------------------------------------------------------------
# Run data migration
# ---------------------------------------------------------------------------

log "Running data migration..."
docker compose run --rm migrate

# ---------------------------------------------------------------------------
# Run storage migration (if service account exists)
# ---------------------------------------------------------------------------

if [ -f "firebase-service-account.json" ]; then
  log "Running storage migration..."
  docker compose run --rm migrate-storage
else
  warn "Skipping storage migration (firebase-service-account.json not found)"
fi

# ---------------------------------------------------------------------------
# Run validation
# ---------------------------------------------------------------------------

log "Running post-migration validation..."
docker compose run --rm migrate-validate

# ---------------------------------------------------------------------------
# Build and start the app
# ---------------------------------------------------------------------------

log "Building and starting the app..."
docker compose up -d --build app

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

APP_PORT="${APP_PORT:-80}"

echo ""
echo "============================================================================"
log "Deployment complete!"
echo "============================================================================"
echo ""
echo "  App:      http://localhost:${APP_PORT} (or your server's address)"
echo "  Supabase: ${SUPABASE_URL} (managed separately from this deploy)"
echo ""

if [ -f "data/export/_user_credentials.json" ]; then
  echo "  Credentials: data/export/_user_credentials.json"
else
  warn "  No credentials file found — check migration output above."
fi

echo ""
echo "  To bootstrap a brand-new Supabase instance: bash scripts/deploy.sh --fresh"
echo "  To update app only:                          docker compose up -d --build app"
echo ""
