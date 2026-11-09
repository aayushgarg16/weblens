#!/usr/bin/env bash
# Starts a SEPARATE Chrome (own profile dir) with the DevTools port open on localhost only.
# Your everyday Chrome is untouched; log in to the target app in this window.
#   ./scripts/chrome.sh                 # opens about:blank
#   ./scripts/chrome.sh https://app.intellect.co/
#   ./scripts/chrome.sh demo            # opens the offline demo page
set -euo pipefail
cd "$(dirname "$0")/.."

PORT="${WEBLENS_PORT:-9222}"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
URL="${1:-about:blank}"
[[ "$URL" == "demo" ]] && URL="file://$PWD/fixtures/demo.html"

exec "$CHROME" \
  --remote-debugging-port="$PORT" \
  --remote-debugging-address=127.0.0.1 \
  --user-data-dir="$PWD/.chrome-profile" \
  --no-first-run --no-default-browser-check \
  "$URL"
