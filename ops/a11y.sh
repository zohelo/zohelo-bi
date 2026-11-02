#!/usr/bin/env bash
# Accessibility check on the built portal with its data (zohelo-data#2499): serves apps/portal/dist
# and its API locally (wrangler pages dev, read token only, as ops/smoke.sh) and runs ops/a11y.mjs on it.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root/apps/portal"
{
  echo "PLATFORM_ACCOUNT_ID=$CLOUDFLARE_ACCOUNT_ID"
  echo "STORAGE_LAKEHOUSE_BUCKET_NAME=$STORAGE_LAKEHOUSE_BUCKET_NAME"
  echo "STORAGE_LAKEHOUSE_CATALOG_READ_TOKEN=$STORAGE_LAKEHOUSE_CATALOG_READ_TOKEN"
} > .dev.vars
bunx wrangler pages dev dist --port 8789 --compatibility-date 2026-10-01 > /tmp/pages-dev-a11y.log 2>&1 &
trap 'kill %1 2>/dev/null; rm -f .dev.vars' EXIT
for _ in $(seq 1 60); do curl -s -o /dev/null http://localhost:8789/ && break; sleep 1; done
cd "$root"
node ops/a11y.mjs --origin http://localhost:8789 --report a11y-report.json "$@"
