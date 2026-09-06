#!/usr/bin/env bash
# =============================================================================
# deploy.sh — Server-side deployment orchestrator
#
# Usage:
#   bash scripts/deploy.sh           # Normal deploy (skip migration if DB exists)
#   bash scripts/deploy.sh --fresh   # Wipe volumes, re-run all migrations
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

wait_for_healthy() {
  local service="$1"
  local timeout="${2:-60}"
  local elapsed=0

  log "Waiting for $service to be healthy (timeout: ${timeout}s)..."
  while [ $elapsed -lt "$timeout" ]; do
    if docker compose ps "$service" 2>/dev/null | grep -q "healthy"; then
      log "$service is healthy."
      return 0
    fi
    sleep 2
    elapsed=$((elapsed + 2))
  done

  error "$service did not become healthy within ${timeout}s"
  docker compose logs --tail=20 "$service"
  return 1
}

wait_for_service() {
  local service="$1"
  local timeout="${2:-60}"
  local elapsed=0

  log "Waiting for $service to start (timeout: ${timeout}s)..."
  while [ $elapsed -lt "$timeout" ]; do
    if docker compose ps "$service" 2>/dev/null | grep -q "Up\|running"; then
      log "$service is running."
      return 0
    fi
    sleep 2
    elapsed=$((elapsed + 2))
  done

  error "$service did not start within ${timeout}s"
  docker compose logs --tail=20 "$service"
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

if [ ! -d "data/export" ]; then
  error "data/export/ directory not found. Export Firebase data first."
  exit 1
fi

# ---------------------------------------------------------------------------
# Fresh deploy: wipe volumes
# ---------------------------------------------------------------------------

if [ "$FRESH" = true ]; then
  warn "Fresh deploy requested — wiping all volumes..."
  docker compose down -v
fi

# ---------------------------------------------------------------------------
# Start infrastructure services
# ---------------------------------------------------------------------------

log "Starting infrastructure services..."
docker compose up -d

# Wait for critical services
wait_for_healthy "db" 60
wait_for_service "kong" 60
wait_for_service "auth" 60

# Give auth a few extra seconds to finish internal setup
sleep 3

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
# Summary
# ---------------------------------------------------------------------------

APP_PORT="${APP_PORT:-80}"
STUDIO_PORT="${STUDIO_PORT:-3001}"
SITE_URL="${SITE_URL:-http://localhost}"

echo ""
echo "============================================================================"
log "Deployment complete!"
echo "============================================================================"
echo ""
echo "  App:      ${SITE_URL}:${APP_PORT}"
echo "  Studio:   bound to 127.0.0.1:${STUDIO_PORT} on this host (no login of"
echo "            its own). Reach it from your workstation with:"
echo "              ssh -L ${STUDIO_PORT}:127.0.0.1:${STUDIO_PORT} \$USER@\$(hostname)"
echo ""

if [ -f "data/export/_user_credentials.json" ]; then
  echo "  Credentials: data/export/_user_credentials.json"
else
  warn "  No credentials file found — check migration output above."
fi

echo ""
echo "  To re-deploy with fresh data:  bash scripts/deploy.sh --fresh"
echo "  To update app only:            docker compose build app && docker compose up -d app"
echo ""
