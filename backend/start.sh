#!/usr/bin/env bash
# Fastify JS backend — no Nest/tsc build step.
set -e
cd "$(dirname "$0")"
echo "[templatecraft-api] Starting Fastify (src/server.js)..."
exec node src/server.js
