#!/usr/bin/env bash
# =============================================================================
# package-for-deploy.sh — Build app image + create deployment archive (Linux/macOS)
#
# Usage:
#   bash scripts/package-for-deploy.sh
#
# Produces:
#   the-eighth-app.tar               — Docker image (docker load on server)
#   the-eighth-deploy-<timestamp>.tar — Config, migrations, scripts, data,
#                                        AND the deploy/supabase/ stack
#
# NG_APP_SUPABASE_URL is deliberately never baked in: environment.prod.ts
# falls back to window.location.origin, and the app's nginx reverse-proxies
# Supabase calls to the Envoy gateway over the supabase Docker network
# (see docker-compose.portainer.yml, docker/nginx.conf,
# deploy/supabase/docker-compose.yml). Only the anon key — meant to be
# public — is baked in, read from deploy/supabase/.env (the production
# Supabase stack's own config), not the repo-root .env (that one is for
# local dev, which points directly at a Supabase URL).
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

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

if [ ! -f "Dockerfile" ]; then
  error "Dockerfile not found. Run from project root."
  exit 1
fi

if ! docker version >/dev/null 2>&1; then
  error "Docker is not running."
  exit 1
fi

if [ ! -f "deploy/supabase/.env" ]; then
  error "deploy/supabase/.env not found."
  error "Generate production secrets first: node scripts/generate-supabase-secrets.js"
  exit 1
fi

# ---------------------------------------------------------------------------
# Step 1: Build the Docker image
# ---------------------------------------------------------------------------

TENANT="the-eighth"
if [ -f ".env" ]; then
  val=$(grep -E "^\s*NG_APP_TENANT\s*=" .env | tail -1 | cut -d= -f2- | xargs || true)
  [ -n "$val" ] && TENANT="$val"
fi

ANON_KEY=$(grep -E "^ANON_KEY=" deploy/supabase/.env | tail -1 | cut -d= -f2-)
if [ -z "$ANON_KEY" ]; then
  error "ANON_KEY not set in deploy/supabase/.env"
  exit 1
fi

log "Building Docker image (tenant: $TENANT, platform: linux/amd64)..."
log "NG_APP_SUPABASE_URL left unset — same-origin, proxied by nginx."

docker build \
  --platform linux/amd64 \
  -t the-eighth-app:latest \
  --build-arg "NG_APP_TENANT=$TENANT" \
  --build-arg "NG_APP_SUPABASE_ANON_KEY=$ANON_KEY" \
  .

# ---------------------------------------------------------------------------
# Step 2: Save the image
# ---------------------------------------------------------------------------

IMAGE_TAR="the-eighth-app.tar"
log "Saving image to $IMAGE_TAR..."
docker save -o "$IMAGE_TAR" the-eighth-app:latest
log "Image saved: $IMAGE_TAR ($(du -h "$IMAGE_TAR" | cut -f1))"

# ---------------------------------------------------------------------------
# Step 3: Create the deployment archive
# ---------------------------------------------------------------------------

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
ARCHIVE="the-eighth-deploy-${TIMESTAMP}.tar"

log "Creating deployment archive: $ARCHIVE"

FILES=(
  docker-compose.portainer.yml
  docker
  deploy/supabase
  supabase/migrations
  scripts/run-migrations.sh
  scripts/transform-and-migrate.ts
  scripts/migrate-storage.ts
  scripts/validate-migration.ts
  data/export
  src/assets
  package.json
  package-lock.json
  tsconfig.json
)

for f in firebase-service-account.json data/user-credentials.json; do
  if [ -f "$f" ]; then
    FILES+=("$f")
    log "  Including optional: $f"
  else
    warn "  Skipping optional (not found): $f"
  fi
done

tar cf "$ARCHIVE" \
  --exclude='node_modules' --exclude='.angular' --exclude='.git' \
  --exclude='coverage' --exclude='*.tmp' --exclude='deploy/supabase/.env.example' \
  "${FILES[@]}"

log "Archive created: $ARCHIVE ($(du -h "$ARCHIVE" | cut -f1))"

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

echo ""
echo "============================================================================"
log "Packaging complete!"
echo "============================================================================"
echo ""
echo "  Image:   $IMAGE_TAR"
echo "  Archive: $ARCHIVE"
echo ""
echo "On the server (one-time, before either stack exists):"
echo "  docker network create supabase"
echo ""
echo "After copying both files over (you're handling that via SSH):"
echo "  docker load -i $IMAGE_TAR"
echo "  tar xf $ARCHIVE"
echo "  cd deploy/supabase && docker compose up -d   # create as its own Portainer stack"
echo "  Create a second Portainer stack from docker-compose.portainer.yml"
echo "  bash scripts/run-migrations.sh"
echo ""
warn "  Root .env on the server (used by run-migrations.sh) needs:"
warn "    SUPABASE_URL=http://<server-LAN-IP>:8000   (same as GATEWAY_BIND_IP in deploy/supabase/.env, not the public domain)"
warn "    SUPABASE_SERVICE_ROLE_KEY=<same value as SERVICE_ROLE_KEY in deploy/supabase/.env>"
echo ""
