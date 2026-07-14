#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_URL="${WEB_URL:-http://localhost:8080}"
API_URL="${API_URL:-http://localhost:3000/api/health}"

cd "$ROOT_DIR"

docker compose up -d --build

for _ in $(seq 1 30); do
  if curl -fsS "$API_URL" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if command -v open >/dev/null 2>&1; then
  open "$WEB_URL"
else
  printf 'Open %s in your browser.\n' "$WEB_URL"
fi

