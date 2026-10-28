#!/usr/bin/env bash
# Fails when a workflow action is not pinned to a full commit SHA with a version comment,
# e.g. `uses: actions/checkout@<40-hex-sha>  # v7.0.1`. Local actions (`uses: ./...`) are skipped.
set -euo pipefail

cd "$(dirname "$0")/.."

count=0
violations=0
while IFS= read -r match; do
  file="${match%%:*}"
  rest="${match#*:}"
  line="${rest%%:*}"
  text="${rest#*:}"
  value="$(sed -E 's/^[[:space:]-]*uses:[[:space:]]*([^[:space:]]+).*$/\1/' <<<"$text")"
  if [[ "$value" == ./* ]]; then
    continue
  fi
  count=$((count + 1))
  if ! grep -qE '@[0-9a-f]{40}[[:space:]]+# v' <<<"$text"; then
    echo "::error file=${file},line=${line}::action not pinned to a full SHA with a version comment"
    violations=$((violations + 1))
  fi
done < <(grep -rnE '^[[:space:]-]*uses:[[:space:]]*[^[:space:]]+' .github/workflows || true)

if ((violations > 0)); then
  exit 1
fi
echo "pins ok (${count} uses)"
