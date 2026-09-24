# =============================================================================
# package-for-deploy.ps1 — Build app image + create deployment archive (Windows)
#
# Usage:
#   powershell -File scripts/package-for-deploy.ps1
#   powershell -File scripts/package-for-deploy.ps1 -IncludeMigrationSecrets
#
# The Firebase service account key and the user password files are left out
# unless -IncludeMigrationSecrets is given. Only a first-time Firestore
# migration needs them; any other deploy would just leave them on the server.
#
# Produces two files:
#   the-eighth-app.tar              — Docker image (docker load on server)
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

param(
    [switch]$IncludeMigrationSecrets
)

$ErrorActionPreference = "Stop"
$ProjectDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $ProjectDir

# ---------------------------------------------------------------------------
# Pre-flight checks
# ---------------------------------------------------------------------------

if (-not (Test-Path "data/export")) {
    Write-Error "data/export/ not found. Run 'npm run migrate:export' first."
    exit 1
}

if (-not (Test-Path "Dockerfile")) {
    Write-Error "Dockerfile not found. Run from project root."
    exit 1
}

# Check Docker is available
try {
    docker version | Out-Null
} catch {
    Write-Error "Docker is not running. Start Docker Desktop first."
    exit 1
}

if (-not (Test-Path "deploy/supabase/.env")) {
    Write-Error "deploy/supabase/.env not found. Generate production secrets first: node scripts/generate-supabase-secrets.js"
    exit 1
}

# ---------------------------------------------------------------------------
# Step 1: Build Docker image
# ---------------------------------------------------------------------------

# Tenant comes from the repo-root .env (local dev config); the anon key
# comes from deploy/supabase/.env (the production Supabase stack's own
# config) — these are two different .env files for two different purposes.
$Tenant = "the-eighth"
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match "^\s*NG_APP_TENANT\s*=\s*(.+)") { $Tenant = $Matches[1].Trim() }
    }
}

$AnonKey = ""
Get-Content "deploy/supabase/.env" | ForEach-Object {
    if ($_ -match "^ANON_KEY=(.+)") { $AnonKey = $Matches[1].Trim() }
}
if (-not $AnonKey) {
    Write-Error "ANON_KEY not set in deploy/supabase/.env"
    exit 1
}

Write-Host "[package] Building Docker image (tenant: $Tenant, platform: linux/amd64)..." -ForegroundColor Green
Write-Host "[package] NG_APP_SUPABASE_URL left unset - same-origin, proxied by nginx." -ForegroundColor Green

$buildArgs = @("build", "--platform", "linux/amd64", "-t", "the-eighth-app:latest",
    "--build-arg", "NG_APP_TENANT=$Tenant",
    "--build-arg", "NG_APP_SUPABASE_ANON_KEY=$AnonKey",
    ".")

& docker @buildArgs
if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker build failed."
    exit 1
}

# ---------------------------------------------------------------------------
# Step 2: Save Docker image to .tar
# ---------------------------------------------------------------------------

$ImageTar = "the-eighth-app.tar"

Write-Host "[package] Saving image to $ImageTar..." -ForegroundColor Green
docker save -o $ImageTar the-eighth-app:latest
if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker save failed."
    exit 1
}

$ImageSize = "{0:N1} MB" -f ((Get-Item $ImageTar).Length / 1MB)
Write-Host "[package] Image saved: $ImageTar ($ImageSize)" -ForegroundColor Green

# ---------------------------------------------------------------------------
# Step 3: Create deployment archive (config + migrations + data)
# ---------------------------------------------------------------------------

$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$Archive = "the-eighth-deploy-$Timestamp.tar"

Write-Host "[package] Creating deployment archive: $Archive" -ForegroundColor Green

$Files = @(
    "docker-compose.portainer.yml"
    "docker"
    "deploy/supabase"
    "supabase/migrations"
    "scripts/run-migrations.sh"
    "scripts/transform-and-migrate.ts"
    "scripts/migrate-storage.ts"
    "scripts/validate-migration.ts"
    "data/export"
    "src/assets"
    "package.json"
    "package-lock.json"
    "tsconfig.json"
)

$Excludes = @(
    "--exclude=node_modules"
    "--exclude=.angular"
    "--exclude=.git"
    "--exclude=coverage"
    "--exclude=*.tmp"
    "--exclude=deploy/supabase/.env.example"
)

if ($IncludeMigrationSecrets) {
    foreach ($f in @("firebase-service-account.json", "data/user-credentials.json")) {
        if (Test-Path $f) {
            $Files += $f
            Write-Host "  Including migration secret: $f" -ForegroundColor Yellow
        } else {
            Write-Host "  Skipping migration secret (not found): $f" -ForegroundColor Yellow
        }
    }
} else {
    # Written by transform-and-migrate.ts; holds every user's password.
    $Excludes += "--exclude=data/export/_user_credentials.json"
    Write-Host "  Leaving out migration secrets (pass -IncludeMigrationSecrets for a first-time migration)" -ForegroundColor Green
}

tar cf $Archive @Excludes $Files

$ArchiveSize = "{0:N1} MB" -f ((Get-Item $Archive).Length / 1MB)
Write-Host "[package] Archive created: $Archive ($ArchiveSize)" -ForegroundColor Green

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

Write-Host ""
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "  Packaging complete!" -ForegroundColor Green
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Image:   $ImageTar ($ImageSize)"
Write-Host "  Archive: $Archive ($ArchiveSize)"
Write-Host ""
Write-Host "On the server (one-time, before either stack exists):" -ForegroundColor Yellow
Write-Host "  docker network create supabase"
Write-Host ""
Write-Host "Copy both files to the server, then:" -ForegroundColor Yellow
Write-Host "  docker load -i $ImageTar"
Write-Host "  tar xf $Archive"
Write-Host "  cd deploy/supabase && docker compose up -d   # create as its own Portainer stack"
Write-Host "  Create a second Portainer stack from docker-compose.portainer.yml"
Write-Host "  bash scripts/run-migrations.sh"
Write-Host ""
Write-Host "Root .env on the server (used by run-migrations.sh) needs:" -ForegroundColor Yellow
Write-Host "  SUPABASE_URL=http://<server-LAN-IP>:8000   (same as GATEWAY_BIND_IP in deploy/supabase/.env, not the public domain)"
Write-Host "  SUPABASE_SERVICE_ROLE_KEY=<same value as SERVICE_ROLE_KEY in deploy/supabase/.env>"
Write-Host ""
