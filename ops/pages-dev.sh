#!/usr/bin/env bash
# Sourced by ops/smoke.sh and ops/a11y.sh: `start_pages_dev <port>` serves apps/portal/dist and its
# API locally (wrangler pages dev) with the lakehouse read token, waits until it answers (exit 1 with
# the end of its log when it does not) and stops it and removes .dev.vars when the script exits.
start_pages_dev() {
  local port=$1 portal
  portal="$(cd "$(dirname "${BASH_SOURCE[0]}")/../apps/portal" && pwd)"
  PAGES_DEV_LOG="/tmp/pages-dev-$port.log"
  {
    echo "PLATFORM_ACCOUNT_ID=$CLOUDFLARE_ACCOUNT_ID"
    echo "STORAGE_LAKEHOUSE_BUCKET_NAME=$STORAGE_LAKEHOUSE_BUCKET_NAME"
    echo "STORAGE_LAKEHOUSE_CATALOG_READ_TOKEN=$STORAGE_LAKEHOUSE_CATALOG_READ_TOKEN"
    # The published layer (/api/published/*), as ops/ensure-platform.ts sets it on the Pages project,
    # when the caller passes the read key pair (ops/a11y.sh does; the smoke test does not need it).
    if [ -n "${STORAGE_LAKEHOUSE_READ_ACCESS_KEY:-}" ]; then
      echo "STORAGE_ENDPOINT_URL=$STORAGE_ENDPOINT_URL"
      echo "STORAGE_LAKEHOUSE_READ_ACCESS_KEY=$STORAGE_LAKEHOUSE_READ_ACCESS_KEY"
      echo "STORAGE_LAKEHOUSE_READ_SECRET_KEY=$STORAGE_LAKEHOUSE_READ_SECRET_KEY"
      echo "PUBLISHED_PREFIX=06_published/v1"
    fi
  } > "$portal/.dev.vars"
  (cd "$portal" && exec bunx wrangler pages dev dist --port "$port" --compatibility-date 2026-10-01) > "$PAGES_DEV_LOG" 2>&1 &
  PAGES_DEV_PID=$!
  # shellcheck disable=SC2064 # expand now: the pid and path are fixed for this script
  trap "kill $PAGES_DEV_PID 2>/dev/null; rm -f '$portal/.dev.vars'" EXIT
  for _ in $(seq 1 60); do
    curl -s -o /dev/null "http://localhost:$port/" && return 0
    sleep 1
  done
  echo "::error title=pages dev::wrangler pages dev did not answer on port $port within 60 s"
  tail -n 30 "$PAGES_DEV_LOG"
  exit 1
}
