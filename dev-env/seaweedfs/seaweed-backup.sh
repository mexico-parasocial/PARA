#!/usr/bin/env bash
set -euo pipefail

# Backs up local SeaweedFS Docker volumes to a timestamped Mac mini directory.
# This backs up the rehearsal cluster only. It does not touch R2 or production.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_ROOT="${SEAWEEDFS_BACKUP_ROOT:-/Users/mlv/Backups/para/seaweedfs}"
PROJECT_NAME="${SEAWEEDFS_COMPOSE_PROJECT:-seaweedfs}"
TIMESTAMP="$(date -u +%Y%m%d_%H%M%S)"
BACKUP_DIR="${1:-${BACKUP_ROOT}/${TIMESTAMP}}"

volumes=(
  "seaweed_master"
  "seaweed_volume"
  "seaweed_filer"
)

require_volume() {
  local volume="$1"
  if ! docker volume inspect "$volume" > /dev/null 2>&1; then
    echo "Missing Docker volume: $volume" >&2
    echo "Start the cluster first with: ${SCRIPT_DIR}/seaweed-up.sh" >&2
    exit 1
  fi
}

mkdir -p "$BACKUP_DIR"

echo "═══════════════════════════════════════════════════════════════"
echo "  SeaweedFS Local Backup"
echo "═══════════════════════════════════════════════════════════════"
echo "Project: $PROJECT_NAME"
echo "Backup:  $BACKUP_DIR"
echo ""

for short_name in "${volumes[@]}"; do
  volume="${PROJECT_NAME}_${short_name}"
  require_volume "$volume"
  echo "Backing up $volume ..."
  docker run --rm \
    -v "${volume}:/data:ro" \
    -v "${BACKUP_DIR}:/backup" \
    alpine:3.20 \
    tar czf "/backup/${short_name}.tar.gz" -C /data .
done

cp "${SCRIPT_DIR}/docker-compose.seaweedfs.yml" "${BACKUP_DIR}/docker-compose.seaweedfs.yml"
cp "${SCRIPT_DIR}/s3-config.json" "${BACKUP_DIR}/s3-config.json"

cat > "${BACKUP_DIR}/manifest.txt" <<EOF
created_at=${TIMESTAMP}
compose_project=${PROJECT_NAME}
seaweed_image=chrislusf/seaweedfs:4.31
source=${SCRIPT_DIR}
volumes=${PROJECT_NAME}_seaweed_master,${PROJECT_NAME}_seaweed_volume,${PROJECT_NAME}_seaweed_filer
EOF

echo ""
echo "Backup complete:"
du -sh "$BACKUP_DIR"
find "$BACKUP_DIR" -maxdepth 1 -type f -print
