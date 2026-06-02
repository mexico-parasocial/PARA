#!/usr/bin/env bash
set -euo pipefail

# run-pds-tests.sh
# Stages a SeaweedFS test cluster and runs the @atproto/pds test suite against it.
# This is your operational muscle workout: spin up, test, tear down.
#
# Usage:
#   cd dev-env/seaweedfs
#   ./run-pds-tests.sh [jest-args...]
#
# Examples:
#   ./run-pds-tests.sh
#   ./run-pds-tests.sh --testNamePattern="blob"
#   ./run-pds-tests.sh tests/file-uploads.test.ts

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PARA_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
REPO_ROOT="$(cd "${PARA_ROOT}/.." && pwd)"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.seaweedfs.yml"
BACKEND_ROOT="${BACKEND_ROOT:-${REPO_ROOT}/WatZappa}"
PDS_DIR="${PDS_DIR:-${BACKEND_ROOT}/packages/pds}"
DEV_INFRA="${DEV_INFRA:-${BACKEND_ROOT}/packages/dev-infra}"
JEST_BIN="${JEST_BIN:-}"

if [ -z "${JEST_BIN}" ]; then
  for candidate in \
    "${PDS_DIR}/node_modules/.bin/jest" \
    "${BACKEND_ROOT}/node_modules/.bin/jest" \
    "${PARA_ROOT}/node_modules/.bin/jest" \
    "${PARA_ROOT}/../node_modules/.bin/jest"; do
    if [ -x "$candidate" ]; then
      JEST_BIN="$candidate"
      break
    fi
  done
fi

# ── Load env if present ──
if [ -f "${SCRIPT_DIR}/.env.seaweedfs" ]; then
  set -a
  # shellcheck source=/dev/null
  source "${SCRIPT_DIR}/.env.seaweedfs"
  set +a
fi

# ── Default env vars ──
export SEAWEEDFS_S3_ENDPOINT="${SEAWEEDFS_S3_ENDPOINT:-http://localhost:8333}"
export SEAWEEDFS_ACCESS_KEY="${SEAWEEDFS_ACCESS_KEY:-weed}"
export SEAWEEDFS_SECRET_KEY="${SEAWEEDFS_SECRET_KEY:-weed_secret}"
export SEAWEEDFS_BUCKET="${SEAWEEDFS_BUCKET:-blobs}"

# These are read by the patched @atproto/dev-env
export DEV_ENV_PDS_BLOBSTORE_S3_BUCKET="${DEV_ENV_PDS_BLOBSTORE_S3_BUCKET:-blobs}"
export DEV_ENV_PDS_BLOBSTORE_S3_REGION="${DEV_ENV_PDS_BLOBSTORE_S3_REGION:-us-east-1}"
export DEV_ENV_PDS_BLOBSTORE_S3_ENDPOINT="${DEV_ENV_PDS_BLOBSTORE_S3_ENDPOINT:-http://localhost:8333}"
export DEV_ENV_PDS_BLOBSTORE_S3_FORCE_PATH_STYLE="${DEV_ENV_PDS_BLOBSTORE_S3_FORCE_PATH_STYLE:-true}"
export DEV_ENV_PDS_BLOBSTORE_S3_ACCESS_KEY_ID="${DEV_ENV_PDS_BLOBSTORE_S3_ACCESS_KEY_ID:-weed}"
export DEV_ENV_PDS_BLOBSTORE_S3_SECRET_ACCESS_KEY="${DEV_ENV_PDS_BLOBSTORE_S3_SECRET_ACCESS_KEY:-weed_secret}"

# Existing dev-env vars
export DB_POSTGRES_URL="${DB_POSTGRES_URL:-postgresql://pg:password@127.0.0.1:5433/postgres}"
export REDIS_HOST="${REDIS_HOST:-127.0.0.1:6380}"

echo "═══════════════════════════════════════════════════════════════"
echo "  SeaweedFS × PDS Test Runner"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "🚀 Starting SeaweedFS cluster ..."
docker compose -f "${COMPOSE_FILE}" up --wait --force-recreate

# ── Cleanup on exit ──
cleanup() {
  echo ""
  echo "🧹 Tearing down SeaweedFS cluster ..."
  docker compose -f "${COMPOSE_FILE}" rm -f --stop --volumes
}
trap cleanup EXIT

echo ""
echo "📦 Initializing S3 bucket ..."
"${SCRIPT_DIR}/init-bucket.sh"

echo ""
echo "🔍 Pre-flight diagnostics ..."
"${SCRIPT_DIR}/diagnose.sh"

echo ""
echo "───────────────────────────────────────────────────────────────"
echo "  Running PDS test suite"
echo "  PDS dir: ${PDS_DIR}"
echo "  Jest args: $*"
echo "───────────────────────────────────────────────────────────────"
echo ""

if [ ! -d "${PDS_DIR}" ]; then
  echo "❌ PDS package not found at ${PDS_DIR}"
  echo "   Set BACKEND_ROOT=/path/to/WatZappa or run dependencies in the backend checkout."
  exit 1
fi

if [ ! -x "${DEV_INFRA}/with-test-redis-and-db.sh" ]; then
  echo "❌ Dev infra test wrapper not found at ${DEV_INFRA}/with-test-redis-and-db.sh"
  echo "   Set DEV_INFRA=/path/to/packages/dev-infra if your backend checkout is elsewhere."
  exit 1
fi

if [ -z "${JEST_BIN}" ]; then
  echo "❌ Jest binary not found."
  echo "   Checked PDS, PARA, and repo root node_modules."
  exit 1
fi

# The PDS package runs tests via ../dev-infra/with-test-redis-and-db.sh jest
# We cd into the PDS dir and run the same command, but with our env vars exported.
cd "${PDS_DIR}"
"${DEV_INFRA}/with-test-redis-and-db.sh" "${JEST_BIN}" "$@"

TEST_EXIT=$?

echo ""
if [ $TEST_EXIT -eq 0 ]; then
  echo "✅ PDS test suite PASSED against SeaweedFS"
else
  echo "❌ PDS test suite FAILED (exit ${TEST_EXIT})"
fi

exit $TEST_EXIT
