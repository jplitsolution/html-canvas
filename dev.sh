#!/usr/bin/env bash
#
# Ek command me frontend (Vite) + backend (NestJS) dono dev mode me chalao.
#
# Usage:
#   ./dev.sh            # dono chalao
#   ./dev.sh frontend   # sirf frontend
#   ./dev.sh backend    # sirf backend
#
# Ctrl+C dabane par dono processes cleanly band ho jayenge.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_DIR="$ROOT_DIR/backend"

# Colors for prefixed logs
C_FE="\033[36m"   # cyan
C_BE="\033[35m"   # magenta
C_RESET="\033[0m"

pids=()

cleanup() {
  echo -e "\n${C_RESET}Shutting down dev servers..."
  for pid in "${pids[@]}"; do
    # Poore process group ko maar do (child processes bhi)
    kill -- -"$pid" 2>/dev/null || kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
  exit 0
}
trap cleanup INT TERM

ensure_deps() {
  local dir="$1" name="$2"
  if [ ! -d "$dir/node_modules" ]; then
    echo "[$name] node_modules nahi mila, install kar raha hoon..."
    (cd "$dir" && npm install)
  fi
}

run_frontend() {
  ensure_deps "$FRONTEND_DIR" "frontend"
  (
    cd "$FRONTEND_DIR"
    npm run dev 2>&1 | sed -e "s/^/$(printf "${C_FE}[frontend]${C_RESET} ")/"
  ) &
  pids+=($!)
}

run_backend() {
  ensure_deps "$BACKEND_DIR" "backend"
  (
    cd "$BACKEND_DIR"
    npm run start:dev 2>&1 | sed -e "s/^/$(printf "${C_BE}[backend]${C_RESET} ")/"
  ) &
  pids+=($!)
}

target="${1:-all}"
case "$target" in
  frontend|fe) run_frontend ;;
  backend|be)  run_backend ;;
  all)         run_backend; run_frontend ;;
  *)
    echo "Unknown target: $target (use: frontend | backend | all)"
    exit 1
    ;;
esac

echo "Dev servers chalu ho gaye. Band karne ke liye Ctrl+C dabao."
wait
