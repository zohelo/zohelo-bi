#!/usr/bin/env bash
# Production shows only published data (owner direction of 12 Nov 2026, decision O37): fails when the built portal
# (apps/portal/dist) contains the sample provider. A live build has no dummy or dummyTopics chunk and no sample
# catalogue in any file; vite.config.ts already refuses a production build in another mode, this checks the output.
set -euo pipefail
cd "$(dirname "$0")/../apps/portal/dist"
found=$(ls assets | grep -E '^(dummy|dummyTopics|dummyCatalog)-' || true)
if [ -n "$found" ]; then
  echo "::error title=sample data in production build::$found"
  exit 1
fi
# The sample catalogue's generator constants (data/dummyCatalog.ts) must not be inlined anywhere either.
if grep -lq '"geo":"nuts2"\|geo:"nuts2"' assets/*.js 2>/dev/null; then
  echo "::error title=sample data in production build::the sample catalogue is inlined in $(grep -l 'geo:"nuts2"' assets/*.js | head -1)"
  exit 1
fi
echo "live build: no sample data"
