#!/bin/bash
# Syncs canonical com.para lexicons from WatZappa into indigo-main and
# verifies committed Go code matches the lexicons (drift check).
#
# Single source of truth: <WatZappa>/lexicons/com/para/**/*.json
# Mirror:                  indigo-main/lexicons/com/para/
#
# Usage:
#   ./scripts/sync-indigo-para-lexicons.sh [--check]
#     (default) copies WatZappa lexicons over the mirror.
#     --check   exits non-zero if the mirror differs (CI drift gate).
#
# Env:
#   WATZAPPA_DIR  path to WatZappa repo (default: <PARA-repo>/../WatZappa)
set -euo pipefail

PARA_DIR="$(cd "$(dirname "$0")/.." && pwd)"
WATZAPPA_DIR="${WATZAPPA_DIR:-$(dirname "$PARA_DIR")/WatZappa}"
SRC="$WATZAPPA_DIR/lexicons/com/para"
DST="$PARA_DIR/indigo-main/lexicons/com/para"

if [ ! -d "$SRC" ]; then
  echo "error: WatZappa lexicons not found at $SRC (set WATZAPPA_DIR)" >&2
  exit 2
fi

if [ "${1:-}" = "--check" ]; then
  if diff -r -q "$SRC" "$DST" > /dev/null; then
    echo "com.para lexicons in sync ($(find "$SRC" -name '*.json' | wc -l | tr -d ' ') schemas)"
  else
    echo "error: indigo-main/lexicons/com/para differs from $SRC" >&2
    diff -r -q "$SRC" "$DST" | head -20 >&2
    echo "run ./scripts/sync-indigo-para-lexicons.sh to re-sync" >&2
    exit 1
  fi
  # Committed Go code must match lexicons: re-running lexgen must be a no-op.
  # (Covers upstream schemas; api/para codegen lands in Phase 2.)
  (cd "$PARA_DIR/indigo-main" && go run ./cmd/lexgen/ --build-file cmd/lexgen/bsky.json ./lexicons > /dev/null)
  if [ -n "$(cd "$PARA_DIR" && git status --porcelain -- indigo-main/api indigo-main/gen)" ]; then
    echo "error: indigo-main/api does not match indigo-main/lexicons (run make lexgen/cborgen there)" >&2
    (cd "$PARA_DIR" && git status --porcelain -- indigo-main/api indigo-main/gen) >&2
    exit 1
  fi
  echo "indigo-main/api matches lexicons"
  exit 0
fi

mkdir -p "$DST"
# Mirror exactly: copy new/changed, delete removed.
if command -v rsync > /dev/null; then
  rsync -a --delete --exclude='.DS_Store' "$SRC/" "$DST/"
else
  rm -rf "$DST"
  mkdir -p "$DST"
  cp -R "$SRC/." "$DST/"
fi
echo "synced $(find "$SRC" -name '*.json' | wc -l | tr -d ' ') com.para schemas -> indigo-main/lexicons/com/para"
