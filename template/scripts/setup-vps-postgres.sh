#!/usr/bin/env bash
# scripts/setup-vps-postgres.sh
# VPS setup runbook script for vps-next-postgres profile.
#
# This script is idempotent — it skips steps that have already been completed.
#
# Prerequisites:
#   - .env.vps.example copied to .env with real secrets filled in.
#   - A domain pointed to this VPS with a valid SSL certificate (for NEXTAUTH_URL).
#   - Node.js 20+ and pnpm installed.
#
# Usage:
#   chmod +x scripts/setup-vps-postgres.sh
#   ./scripts/setup-vps-postgres.sh
#
# Steps performed:
#   1. Check for Docker Compose installation (install if missing).
#   2. Copy .env.vps.example to .env if .env does not exist.
#   3. Install pnpm dependencies.
#   4. Start the postgres service and wait for it to become healthy.
#   5. Run Prisma migrations (prisma migrate deploy).
#   6. Run Prisma seed (prisma db seed / seed-users.ts).
#   7. Build + start the app (docker-compose.vps.yml, uses template/Dockerfile).

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

log() { echo "[setup-vps-postgres] $*"; }
step() { echo; echo "=== $* ==="; }

cd "$REPO_ROOT"

# ── Step 1: Docker Compose ─────────────────────────────────────────
step "Step 1: Docker Compose check"
if command -v docker compose &>/dev/null; then
  log "docker compose is already installed: $(docker compose version)"
elif command -v docker-compose &>/dev/null; then
  log "docker-compose (v1) is installed: $(docker-compose --version)"
  log "WARNING: Consider upgrading to Docker Compose v2 (docker compose plugin)."
else
  log "Docker Compose not found. Installing Docker Engine + Compose plugin..."
  if [[ "$(uname -s)" == "Linux" ]]; then
    curl -fsSL https://get.docker.com | bash
    log "Docker installed. Docker Compose plugin is bundled."
  else
    log "ERROR: Docker Compose not found. Please install Docker Desktop from https://www.docker.com/products/docker-desktop"
    exit 1
  fi
fi

# ── Step 2: .env file ──────────────────────────────────────────────
step "Step 2: .env setup"
if [[ -f ".env" ]]; then
  log ".env already exists — skipping copy."
else
  if [[ -f ".env.vps.example" ]]; then
    cp ".env.vps.example" ".env"
    log "Copied .env.vps.example → .env"
    log "IMPORTANT: Edit .env and fill in real secrets before continuing."
    log "Required: DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL, POSTGRES_PASSWORD"
    read -r -p "Have you filled in the required secrets in .env? [y/N] " confirm
    if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
      log "Aborted. Edit .env and re-run."
      exit 1
    fi
  else
    log "ERROR: .env.vps.example not found. Expected at $REPO_ROOT/.env.vps.example"
    exit 1
  fi
fi

# Verify required env vars are set
# shellcheck source=.env
source .env 2>/dev/null || true
MISSING=()
for var in DATABASE_URL NEXTAUTH_SECRET NEXTAUTH_URL POSTGRES_PASSWORD; do
  if [[ -z "${!var:-}" ]]; then
    MISSING+=("$var")
  fi
done
if [[ ${#MISSING[@]} -gt 0 ]]; then
  log "ERROR: Missing required env vars: ${MISSING[*]}"
  log "Edit .env and re-run."
  exit 1
fi

# ── Step 3: pnpm install ───────────────────────────────────────────
step "Step 3: pnpm install"
if command -v pnpm &>/dev/null; then
  pnpm install --frozen-lockfile
  log "pnpm install complete."
else
  log "pnpm not found. Installing via npm..."
  npm install -g pnpm
  pnpm install --frozen-lockfile
fi

# ── Step 4: Start PostgreSQL (required BEFORE migrate/seed) ───────
# postgres binds to 127.0.0.1:5432 (loopback only, docker-compose.vps.yml)
# so the host-side prisma migrate/seed below can reach localhost:5432.
step "Step 4: docker compose up postgres"
docker compose -f docker-compose.vps.yml up -d postgres
log "Waiting for postgres to become healthy..."
for _ in $(seq 1 30); do
  health="$(docker compose -f docker-compose.vps.yml ps --format '{{.Health}}' postgres 2>/dev/null || true)"
  if [[ "$health" == "healthy" ]]; then
    break
  fi
  sleep 2
done
if [[ "${health:-}" != "healthy" ]]; then
  log "ERROR: postgres did not become healthy within 60s. Check: docker compose -f docker-compose.vps.yml logs postgres"
  exit 1
fi
log "postgres is healthy."

# ── Step 5: Prisma migrate deploy ─────────────────────────────────
step "Step 5: Prisma migrate deploy"
pnpm exec prisma migrate deploy
log "Migrations applied."

# ── Step 6: Prisma db seed ─────────────────────────────────────────
step "Step 6: Prisma db seed"
pnpm exec prisma db seed
log "Seed complete."

# ── Step 7: Docker Compose up (build + start app) ─────────────────
step "Step 7: docker compose up (app)"
docker compose -f docker-compose.vps.yml up -d --build
log "Docker Compose started. Application is running at $NEXTAUTH_URL"
docker compose -f docker-compose.vps.yml ps

log ""
log "Setup complete!"
log "Next steps:"
log "  - Monitor logs: docker compose -f docker-compose.vps.yml logs -f app"
log "  - Stop:         docker compose -f docker-compose.vps.yml down"
log "  - Admin login:  admin@example.com / SEED_PASSWORD (set in .env)"
