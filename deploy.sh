#!/usr/bin/env bash
#
# AlmaLinux production deploy — ek script me sab:
#   - Docker: Elasticsearch only (MySQL bahar hai)
#   - PM2: NestJS backend + Vite frontend (static serve)
#
# Env files server pe pehle se rakho (script overwrite nahi karta):
#   backend/.env
#   frontend/.env.production   (ya frontend/.env) — VITE_API_BASE_URL etc.
#
# Pehli baar:
#   # backend/.env aur frontend/.env.production server pe daalo
#   # jis branch pe checkout ho, usi pe hard reset + pull
#   chmod +x deploy.sh
#   ./deploy.sh
#
# Browser se (nginx + TLS domain):
#   Frontend → https://wap.wellnesss360.com
#   API      → https://wap.wellnesss360.com/api  (VITE_API_BASE_URL=/api)
#
# Usage:
#   ./deploy.sh              # full deploy (ES + build + PM2)
#   ./deploy.sh elasticsearch # sirf Elasticsearch Docker
#   ./deploy.sh apps          # sirf frontend/backend rebuild + PM2 restart
#   ./deploy.sh status        # docker + pm2 status
#   ./deploy.sh logs          # pm2 logs (api + web)
#   ./deploy.sh stop          # PM2 apps band karo
#
# Server reboot ke baad auto-start:
#   sudo env PATH=$PATH pm2 startup systemd -u $USER --hp $HOME
#   pm2 save

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_ENV="$BACKEND_DIR/.env"
FRONTEND_ENV_PRODUCTION="$FRONTEND_DIR/.env.production"
FRONTEND_ENV="$FRONTEND_DIR/.env"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[deploy]${NC} $*"; }
warn() { echo -e "${YELLOW}[deploy]${NC} $*"; }
die()  { echo -e "${RED}[deploy] ERROR:${NC} $*" >&2; exit 1; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "'$1' install nahi hai. Pehle install karo."
}

docker_compose() {
  if docker compose version >/dev/null 2>&1; then
    docker compose -f "$BACKEND_DIR/docker-compose.yml" "$@"
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose -f "$BACKEND_DIR/docker-compose.yml" "$@"
  else
    die "docker compose ya docker-compose nahi mila"
  fi
}

# Source a KEY=VALUE env file without exporting unrelated shell noise.
source_env_file() {
  local file="$1"
  [ -f "$file" ] || return 0
  # shellcheck disable=SC1090
  set -a
  source "$file"
  set +a
}

load_env() {
  if [ ! -f "$BACKEND_ENV" ]; then
    die "backend/.env nahi mila. Server pe backend/.env daalo, phir dubara chalao."
  fi

  source_env_file "$BACKEND_ENV"

  # Frontend Vite env (optional for ES-only / status; required for app build)
  if [ -f "$FRONTEND_ENV_PRODUCTION" ]; then
    source_env_file "$FRONTEND_ENV_PRODUCTION"
  elif [ -f "$FRONTEND_ENV" ]; then
    source_env_file "$FRONTEND_ENV"
  fi

  BACKEND_PORT="${PORT:-${BACKEND_PORT:-3000}}"
  FRONTEND_PORT="${FRONTEND_PORT:-8080}"
  ELASTICSEARCH_NODE="${ELASTICSEARCH_NODE:-http://127.0.0.1:9200}"

  # Same-origin /api is required for HTTPS (mixed-content safe).
  if [ -n "${VITE_API_BASE_URL:-}" ] && [[ "$VITE_API_BASE_URL" == http://* ]]; then
    warn "Ignoring insecure VITE_API_BASE_URL=$VITE_API_BASE_URL — using /api"
    API_URL="/api"
  else
    API_URL="${VITE_API_BASE_URL:-/api}"
  fi
  WEB_URL="${PUBLIC_WEB_URL:-https://wap.wellnesss360.com}"
}

require_frontend_env() {
  if [ ! -f "$FRONTEND_ENV_PRODUCTION" ] && [ ! -f "$FRONTEND_ENV" ]; then
    die "frontend/.env.production (ya frontend/.env) nahi mila. Server pe daalo, phir dubara chalao."
  fi
}

git_hard_reset_current_branch() {
  require_cmd git
  local branch
  branch="$(git -C "$ROOT_DIR" rev-parse --abbrev-ref HEAD)"
  if [ -z "$branch" ] || [ "$branch" = "HEAD" ]; then
    die "Detached HEAD pe ho — pehle kisi branch pe checkout karo, phir deploy chalao."
  fi

  log "Git fetch + hard reset: origin/$branch"
  git -C "$ROOT_DIR" fetch origin "$branch"
  if ! git -C "$ROOT_DIR" rev-parse --verify "origin/$branch" >/dev/null 2>&1; then
    die "Remote branch origin/$branch nahi mili. Pehle push karo ya sahi branch pe checkout karo."
  fi
  # Local tracked changes discard — .env (gitignore) safe rehta hai
  git -C "$ROOT_DIR" reset --hard "origin/$branch"
  log "Branch $branch ab origin/$branch ke barabar hai ($(git -C "$ROOT_DIR" rev-parse --short HEAD))"
}

start_elasticsearch() {
  require_cmd docker
  log "Elasticsearch Docker start kar raha hoon..."
  docker_compose up -d elasticsearch

  log "Elasticsearch ready hone ka wait (max 90s)..."
  local i
  for i in $(seq 1 45); do
    if curl -fsS "${ELASTICSEARCH_NODE}/_cluster/health" >/dev/null 2>&1; then
      log "Elasticsearch ready hai"
      return 0
    fi
    sleep 2
  done
  warn "Elasticsearch abhi respond nahi kar raha — logs: docker logs templatecraft_elasticsearch"
}

build_backend() {
  log "Backend install (Fastify JS — no build step)..."
  cd "$BACKEND_DIR"
  # Production NODE_ENV skips scripts/hooks we don't need on server
  npm install --ignore-scripts
}

build_frontend() {
  require_frontend_env
  log "Frontend install + build (VITE_API_BASE_URL from frontend env → ${API_URL})..."
  cd "$FRONTEND_DIR"
  # Server often has NODE_ENV=production (skips vite/husky). Force devDeps for build;
  # ignore-scripts avoids prepare→husky failing when husky isn't installed yet.
  npm install --include=dev --ignore-scripts
  # serve package — PM2 static files ke liye
  if ! npm ls serve >/dev/null 2>&1; then
    npm install --save-dev --ignore-scripts serve
  fi
  # Vite reads frontend/.env.production (and .env) — do not overwrite those files
  npm run build
  if grep -Rqe 'http://[^"'\'' ]*:3000/api' dist/assets/index-*.js 2>/dev/null; then
    die "Frontend build still contains http://*:3000/api — mixed content will break HTTPS"
  fi
  log "Frontend build OK (no hardcoded http API URL)"
}

start_pm2_apps() {
  require_cmd pm2

  cd "$ROOT_DIR"
  export FRONTEND_PORT
  if pm2 describe templatecraft-api >/dev/null 2>&1; then
    log "PM2 reload..."
    pm2 reload ecosystem.config.cjs --update-env
  else
    log "PM2 start..."
    pm2 start ecosystem.config.cjs
  fi
  pm2 save
}

show_status() {
  echo ""
  log "=== Docker (Elasticsearch) ==="
  docker ps --filter name=templatecraft_elasticsearch --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' 2>/dev/null || warn "Docker nahi chal raha"

  echo ""
  log "=== PM2 ==="
  pm2 list 2>/dev/null || warn "PM2 apps nahi mile"

  echo ""
  log "URLs:"
  echo "  Frontend: $WEB_URL"
  echo "  Backend:  $API_URL"
  echo "  ES:       ${ELASTICSEARCH_NODE}"
  echo ""
  warn "Firewall me ports kholo: ${FRONTEND_PORT}, ${BACKEND_PORT} (aur 9200 sirf local rakho)"
  warn "Reboot ke baad auto-start: sudo env PATH=\$PATH pm2 startup systemd -u \$USER --hp \$HOME && pm2 save"
}

deploy_elasticsearch() {
  load_env
  start_elasticsearch
}

deploy_apps() {
  load_env
  git_hard_reset_current_branch
  build_backend
  build_frontend
  start_pm2_apps
  show_status
}

deploy_all() {
  load_env
  git_hard_reset_current_branch
  start_elasticsearch
  build_backend
  build_frontend
  start_pm2_apps
  show_status
}

cmd="${1:-all}"
case "$cmd" in
  all|deploy)
    deploy_all
    ;;
  elasticsearch|es|docker)
    deploy_elasticsearch
    ;;
  apps|pm2|build)
    deploy_apps
    ;;
  status)
    load_env
    show_status
    ;;
  logs)
    pm2 logs templatecraft-api templatecraft-web
    ;;
  stop)
    pm2 stop templatecraft-api templatecraft-web 2>/dev/null || true
    log "PM2 apps band ho gaye"
    ;;
  *)
    die "Unknown command: $cmd (use: all | elasticsearch | apps | status | logs | stop)"
    ;;
esac

log "Done."
