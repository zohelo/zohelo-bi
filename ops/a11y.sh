#!/usr/bin/env bash
# Accessibility check on the built portal with its data (zohelo-data#2499): serves apps/portal/dist
# and its API (ops/pages-dev.sh, read token only, as ops/smoke.sh) and runs ops/a11y.mjs on it. The
# token and the published-layer read key pair are written to .dev.vars for wrangler and removed from
# the environment of the scan and its browser.
set -euo pipefail
cd "$(dirname "$0")/.."
# shellcheck source=ops/pages-dev.sh
. ops/pages-dev.sh
start_pages_dev 8789
env -u STORAGE_LAKEHOUSE_CATALOG_READ_TOKEN -u STORAGE_LAKEHOUSE_READ_ACCESS_KEY -u STORAGE_LAKEHOUSE_READ_SECRET_KEY node ops/a11y.mjs --origin http://localhost:8789 --report a11y-report.json "$@"
