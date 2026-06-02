#!/usr/bin/env bash
set -euo pipefail

# Prints the storage env changes needed for R2 or local SeaweedFS.
# This never edits production env files.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
BACKEND_ENV="${BACKEND_ENV:-${REPO_ROOT}/WatZappa/.env}"
TARGET="${1:-}"

case "$TARGET" in
  r2)
    PROFILE="${SCRIPT_DIR}/storage.r2.env.example"
    ;;
  seaweed)
    PROFILE="${SCRIPT_DIR}/storage.seaweed.local.env.example"
    ;;
  *)
    echo "Usage: $0 r2|seaweed" >&2
    exit 1
    ;;
esac

vars=(
  PDS_BLOBSTORE_S3_BUCKET
  PDS_BLOBSTORE_S3_REGION
  PDS_BLOBSTORE_S3_ENDPOINT
  PDS_BLOBSTORE_S3_ACCESS_KEY_ID
  PDS_BLOBSTORE_S3_SECRET_ACCESS_KEY
  PDS_BLOBSTORE_S3_FORCE_PATH_STYLE
)

value_from_file() {
  local file="$1"
  local var="$2"
  grep "^${var}=" "$file" 2>/dev/null | cut -d= -f2- | head -1 || true
}

mask_if_secret() {
  local var="$1"
  local value="$2"
  if [[ "$var" == *SECRET* ]] || [[ "$var" == *ACCESS_KEY_ID* ]]; then
    if [ "${#value}" -gt 10 ]; then
      printf '%s...%s' "${value:0:4}" "${value: -4}"
    else
      printf '%s' "$value"
    fi
  else
    printf '%s' "$value"
  fi
}

echo "═══════════════════════════════════════════════════════════════"
echo "  Storage Switch Preview: $TARGET"
echo "═══════════════════════════════════════════════════════════════"
echo "Profile:     $PROFILE"
echo "Backend env: $BACKEND_ENV"
echo "Mutates:     no"
echo ""

for var in "${vars[@]}"; do
  current="$(value_from_file "$BACKEND_ENV" "$var")"
  proposed="$(value_from_file "$PROFILE" "$var")"
  printf '%-40s current=%s proposed=%s\n' \
    "$var" \
    "$(mask_if_secret "$var" "$current")" \
    "$(mask_if_secret "$var" "$proposed")"
done

echo ""
echo "Manual switch checklist:"
echo "  1. Verify target storage with its doctor/setup script."
echo "  2. Copy real target values into ${BACKEND_ENV}."
echo "  3. Restart only PDS first, then run production smoke tests."
echo "  4. Do not switch public alpha traffic to SeaweedFS unless restore drills pass."
