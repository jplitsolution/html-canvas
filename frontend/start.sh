#!/usr/bin/env bash
# Build frontend and start serve — exits with error if build fails.
set -e
echo "[templatecraft-web] Building Vite app..."
npm run build
SERVE_PORT="${FRONTEND_PORT:-8080}"
echo "[templatecraft-web] Build success — serving on port $SERVE_PORT..."
exec npx serve -s dist -l "$SERVE_PORT"
