#!/usr/bin/env bash
set -euo pipefail

# Starts the local SeaweedFS rehearsal cluster, initializes the bucket, and
# runs diagnostics. This is local/dev only; production stays on R2.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.seaweedfs.yml"

if [ -f "${SCRIPT_DIR}/.env.seaweedfs" ]; then
  set -a
  # shellcheck source=/dev/null
  source "${SCRIPT_DIR}/.env.seaweedfs"
  set +a
fi

echo "═══════════════════════════════════════════════════════════════"
echo "  SeaweedFS Local Rehearsal Startup"
echo "═══════════════════════════════════════════════════════════════"
echo "Compose file: ${COMPOSE_FILE}"
echo "Image:        chrislusf/seaweedfs:4.31"
echo ""

docker compose -f "${COMPOSE_FILE}" up -d --wait

echo ""
"${SCRIPT_DIR}/init-bucket.sh"

echo ""
"${SCRIPT_DIR}/diagnose.sh"

echo ""
echo "SeaweedFS local rehearsal cluster is ready."
echo "  S3:     ${SEAWEEDFS_S3_ENDPOINT:-http://localhost:8333}"
echo "  Filer:  http://localhost:8888"
echo "  Master: http://localhost:9333"
