#!/usr/bin/env bash
# Screenshots of the production build on the real published layer (contract v2): serves apps/portal/dist and its
# API (ops/pages-dev.sh, read key pair only, as ops/a11y.sh) and runs ops/live-screens.mjs on it. Output in
# live-screens/: home and one indicator page (PL, 1440 px, full page) and summary.json (KPIs, drafts, failed
# requests). The keys are written to .dev.vars for wrangler and removed from the browser's environment.
set -euo pipefail
cd "$(dirname "$0")/.."
# shellcheck source=ops/pages-dev.sh
. ops/pages-dev.sh
start_pages_dev 8790
env -u STORAGE_LAKEHOUSE_CATALOG_READ_TOKEN -u STORAGE_LAKEHOUSE_READ_ACCESS_KEY -u STORAGE_LAKEHOUSE_READ_SECRET_KEY \
  node ops/live-screens.mjs --origin http://localhost:8790 --out live-screens "$@"
