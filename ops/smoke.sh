#!/usr/bin/env bash
# Serves the built portal and its API locally (wrangler pages dev) against the real lakehouse
# and checks every endpoint and every dashboard tile query answers with rows.
set -euo pipefail
cd "$(dirname "$0")/../apps/portal"
# shellcheck source=ops/pages-dev.sh
. ../../ops/pages-dev.sh
start_pages_dev 8788

fail=0
results=()
check() {  # title, path, jq expression giving a count
  local out code count
  code=$(curl -s -o /tmp/smoke.json -w '%{http_code}' "http://localhost:8788$2")
  count=$(jq -r "$3" /tmp/smoke.json 2>/dev/null || echo "?")
  if [ "$code" = 200 ] && [ "$count" != "0" ] && [ "$count" != "?" ]; then
    results+=("$1: $count")
  else
    echo "::error title=smoke ${1//,/;}::HTTP $code; $count $(head -c 300 /tmp/smoke.json)"
    fail=1
  fi
}
code=$(curl -s -o /tmp/page.html -w '%{http_code}' http://localhost:8788/explore)
if [ "$code" = 200 ] && grep -q 'id="root"' /tmp/page.html; then echo "::notice title=smoke page::HTTP 200 (SPA route)"; else echo "::error title=smoke page::HTTP $code"; fail=1; fi
check "manifest" "/api/manifest" '.metrics | length'
check "catalog" "/api/catalog" 'length'
for m in population gdp_current_prices unemployment_rate inflation fx_rate; do
  check "members $m" "/api/metrics/$m/members" '.combinations | length'
done
# Every dashboard tile's query ($selected replaced by the first voivodeship).
while IFS=$'\t' read -r title path; do
  check "tile: $title" "$path" 'length'
done < <(bun ../../ops/tile-queries.ts)
printf '%s\n' "${results[@]}" >> "${GITHUB_STEP_SUMMARY:-/dev/null}"
summary=$(printf '%s; ' "${results[@]}")
echo "::notice title=smoke passed (${#results[@]} checks)::${summary//,/}"
exit $fail
