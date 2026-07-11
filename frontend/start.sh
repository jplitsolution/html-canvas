#!/usr/bin/env bash
# Exit immediately if a command exits with a non-zero status
set -e

echo "[frontend] Running production build..."
npm run build

echo "[frontend] Starting serve on port ${FRONTEND_PORT:-8080}..."
./node_modules/.bin/serve -s dist -l ${FRONTEND_PORT:-8080}
