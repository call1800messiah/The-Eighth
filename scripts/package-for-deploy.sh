#!/usr/bin/env bash
# =============================================================================
# package-for-deploy.sh — Create deployment archive on dev machine
#
# Usage:
#   bash scripts/package-for-deploy.sh
#   npm run deploy:package
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

log()   { echo -e "${GREEN}[package]${NC} $*"; }
warn()  { echo -e "${YELLOW}[package]${NC} $*"; }
error() { echo -e "${RED}[package]${NC} $*" >&2; }

# ---------------------------------------------------------------------------
# Pre-flight checks
# ---------------------------------------------------------------------------

if [ ! -d "data/export" ]; then
  error "data/export/ not found. Run 'npm run migrate:export' first."
  exit 1
fi

if [ ! -f "docker-compose.yml" ]; then
  error "docker-compose.yml not found. Run from project root."
  exit 1
fi

# ---------------------------------------------------------------------------
# Create archive
# ---------------------------------------------------------------------------

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
ARCHIVE="the-eighth-deploy-${TIMESTAMP}.tar"

log "Creating deployment archive: ${ARCHIVE}"

# Build the file list
FILES=(
  docker-compose.yml
  docker-compose.portainer.yml
  Dockerfile
  .dockerignore
  docker/
  supabase/migrations/
  scripts/deploy.sh
  scripts/run-migrations.sh
  scripts/transform-and-migrate.ts
  scripts/migrate-storage.ts
  scripts/validate-migration.ts
  data/export/
  src/assets/
  package.json
  package-lock.json
  angular.json
  tsconfig.json
  tsconfig.app.json
  src/
)

# Add optional files if they exist
for f in .env firebase-service-account.json data/user-credentials.json; do
  if [ -f "$f" ]; then
    FILES+=("$f")
    log "  Including optional: $f"
  else
    warn "  Skipping optional (not found): $f"
  fi
done

tar cf "$ARCHIVE" \
  --exclude='node_modules' \
  --exclude='.angular' \
  --exclude='.git' \
  --exclude='coverage' \
  --exclude='*.tmp' \
  --exclude='tmpclaude-*' \
  --exclude='nul' \
  "${FILES[@]}"

SIZE=$(du -h "$ARCHIVE" | cut -f1)
log "Archive created: ${ARCHIVE} (${SIZE})"

echo ""
echo "Transfer to server with:"
echo "  scp ${ARCHIVE} user@server:/opt/the-eighth/"
echo ""
echo "If you need storage migration, also transfer:"
echo "  scp firebase-service-account.json user@server:/opt/the-eighth/"
echo ""
