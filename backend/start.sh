#!/usr/bin/env bash
# Exit immediately if a command exits with a non-zero status
set -e

echo "[backend] Running production build..."
npm run build

echo "[backend] Starting production NestJS server..."
node dist/main.js
