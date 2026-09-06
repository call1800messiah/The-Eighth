# =============================================================================
# package-for-deploy.ps1 — Build app image + create deployment archive (Windows)
#
# Usage:
#   powershell -File scripts/package-for-deploy.ps1
#
# Produces two files:
#   the-eighth-app.tar              — Docker image (docker load on server)
#   the-eighth-deploy-<timestamp>.tar — Config, migrations, scripts, data
# =============================================================================

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

# ---------------------------------------------------------------------------
# Step 1: Build Docker image
# ---------------------------------------------------------------------------

# Read tenant and anon key from .env if it exists
$Tenant = "the-eighth"
$AnonKey = ""
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match "^\s*NG_APP_TENANT\s*=\s*(.+)") { $Tenant = $Matches[1].Trim() }
        if ($_ -match "^\s*ANON_KEY\s*=\s*(.+)") { $AnonKey = $Matches[1].Trim() }
    }
}

Write-Host "[package] Building Docker image (tenant: $Tenant)..." -ForegroundColor Green

$buildArgs = @("build", "-t", "the-eighth-app:latest",
    "--build-arg", "NG_APP_TENANT=$Tenant")
if ($AnonKey) {
    $buildArgs += @("--build-arg", "NG_APP_SUPABASE_ANON_KEY=$AnonKey")
}
$buildArgs += "."

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

# Add optional files if they exist
foreach ($f in @("firebase-service-account.json", "data/user-credentials.json")) {
    if (Test-Path $f) {
        $Files += $f
        Write-Host "  Including optional: $f" -ForegroundColor Green
    } else {
        Write-Host "  Skipping optional (not found): $f" -ForegroundColor Yellow
    }
}

tar cf $Archive --exclude='node_modules' --exclude='.angular' --exclude='.git' --exclude='coverage' --exclude='*.tmp' $Files

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
Write-Host "Copy both files to the server:" -ForegroundColor Yellow
Write-Host "  scp $ImageTar $Archive user@server:/opt/the-eighth/"
Write-Host ""
Write-Host "On the server:" -ForegroundColor Yellow
Write-Host "  cd /opt/the-eighth"
Write-Host "  docker load -i $ImageTar"
Write-Host "  tar xf $Archive"
Write-Host ""
Write-Host "Then create a Portainer stack from docker-compose.portainer.yml"
Write-Host "and run:  bash scripts/run-migrations.sh"
Write-Host ""
