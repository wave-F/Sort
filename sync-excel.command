#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "[excel] project: $SCRIPT_DIR"
cd "$SCRIPT_DIR"

echo "[excel] syncing Excel -> JSON ..."
npm run excel:sync

echo "[excel] done."
echo
read -r -p "Press Enter to close..." _
