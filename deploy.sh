#!/usr/bin/env bash
#
# AlmaLinux production deploy — ek script me sab:
#   - Docker: Elasticsearch only (MySQL bahar hai)
#   - PM2: NestJS backend + Vite frontend (static serve)
#
# Pehli baar (domain nahi — sirf IP + port):
#   cp deploy.env.example deploy.env
#   nano deploy.env          # SERVER_HOST = server ki public IP, DB, JWT bharo
#   chmod +x deploy.sh
#   ./deploy.sh
#
# Browser se:
#   Frontend → http://YOUR_IP:8080
#   API      → http://YOUR_IP:3000/api
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
DEPLOY_ENV="$ROOT_DIR/deploy.env"

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

load_deploy_env() {
  if [ ! -f "$DEPLOY_ENV" ]; then
    die "deploy.env nahi mila. Pehle: cp deploy.env.example deploy.env && values bharo"
  fi
  # shellcheck disable=SC1090
  set -a
  source "$DEPLOY_ENV"
  set +a

  : "${SERVER_HOST:?SERVER_HOST deploy.env me set karo}"
  : "${DB_HOST:?DB_HOST deploy.env me set karo}"
  : "${DB_USERNAME:?DB_USERNAME deploy.env me set karo}"
  : "${DB_PASSWORD:?DB_PASSWORD deploy.env me set karo}"
  : "${JWT_SECRET:?JWT_SECRET deploy.env me set karo}"

  BACKEND_PORT="${BACKEND_PORT:-3000}"
  FRONTEND_PORT="${FRONTEND_PORT:-8080}"
  DEPLOY_GIT_PULL="${DEPLOY_GIT_PULL:-false}"
  DEPLOY_GIT_BRANCH="${DEPLOY_GIT_BRANCH:-main}"
  DB_PORT="${DB_PORT:-5432}"
  DB_DATABASE="${DB_DATABASE:-templatecraft}"
  JWT_EXPIRATION="${JWT_EXPIRATION:-24h}"
  ELASTICSEARCH_NODE="${ELASTICSEARCH_NODE:-http://127.0.0.1:9200}"
  ELASTICSEARCH_INDEX="${ELASTICSEARCH_INDEX:-campaign_events}"
  OTP_EXPOSE_TEST="${OTP_EXPOSE_TEST:-true}"
  REDIS_HOST="${REDIS_HOST:-127.0.0.1}"
  REDIS_PORT="${REDIS_PORT:-6379}"

  API_URL="http://${SERVER_HOST}:${BACKEND_PORT}/api"
  WEB_URL="http://${SERVER_HOST}:${FRONTEND_PORT}"
  CORS_ORIGIN="$WEB_URL"
}

maybe_git_pull() {
  if [ "$DEPLOY_GIT_PULL" = "true" ]; then
    require_cmd git
    log "Git pull: $DEPLOY_GIT_BRANCH"
    git -C "$ROOT_DIR" fetch origin
    git -C "$ROOT_DIR" checkout "$DEPLOY_GIT_BRANCH"
    git -C "$ROOT_DIR" pull --ff-only origin "$DEPLOY_GIT_BRANCH"
  fi
}

write_backend_env() {
  log "backend/.env likh raha hoon"
  cat >"$BACKEND_DIR/.env" <<EOF
PORT=${BACKEND_PORT}
NODE_ENV=production

DB_TYPE=${DB_TYPE:-postgres}
DB_HOST=${DB_HOST}
DB_PORT=${DB_PORT}
DB_USERNAME=${DB_USERNAME}
DB_PASSWORD=${DB_PASSWORD}
DB_DATABASE=${DB_DATABASE}

JWT_SECRET=${JWT_SECRET}
JWT_EXPIRATION=${JWT_EXPIRATION}

CORS_ORIGIN=${CORS_ORIGIN}

ELASTICSEARCH_NODE=${ELASTICSEARCH_NODE}
ELASTICSEARCH_INDEX=${ELASTICSEARCH_INDEX}

OTP_EXPOSE_TEST=${OTP_EXPOSE_TEST}

REDIS_HOST=${REDIS_HOST}
REDIS_PORT=${REDIS_PORT}
EOF
}

write_frontend_env() {
  log "frontend/.env.production likh raha hoon (VITE_API_BASE_URL=${API_URL})"
  cat >"$FRONTEND_DIR/.env.production" <<EOF
VITE_API_BASE_URL=${API_URL}
EOF
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
  log "Backend install + build..."
  cd "$BACKEND_DIR"
  HUSKY=0 npm install
  npm run build
}

build_frontend() {
  log "Frontend install + build..."
  cd "$FRONTEND_DIR"
  HUSKY=0 npm install
  # serve package — PM2 static files ke liye
  if ! npm ls serve >/dev/null 2>&1; then
    HUSKY=0 npm install --save-dev serve
  fi
  npm run build
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
  load_deploy_env
  start_elasticsearch
}

deploy_apps() {
  load_deploy_env
  maybe_git_pull
  write_backend_env
  write_frontend_env
  build_backend
  build_frontend
  start_pm2_apps
  show_status
}

deploy_all() {
  load_deploy_env
  maybe_git_pull
  start_elasticsearch
  write_backend_env
  write_frontend_env
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
    load_deploy_env
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
