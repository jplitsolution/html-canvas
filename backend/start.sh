#!/usr/bin/env bash
# Build backend and start — exits with error if build fails.
set -e
echo "[templatecraft-api] Installing dependencies..."
npm install
echo "[templatecraft-api] Building NestJS..."
npm run build
echo "[templatecraft-api] Build success — starting server..."
exec node dist/main.js
