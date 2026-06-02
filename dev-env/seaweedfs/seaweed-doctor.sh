#!/usr/bin/env bash
set -euo pipefail

# Thin production-rehearsal wrapper around diagnose.sh.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -f "${SCRIPT_DIR}/.env.seaweedfs" ]; then
  set -a
  # shellcheck source=/dev/null
  source "${SCRIPT_DIR}/.env.seaweedfs"
  set +a
fi

"${SCRIPT_DIR}/diagnose.sh"
