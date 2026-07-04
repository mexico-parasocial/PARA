#!/usr/bin/env bash
set -euo pipefail

# Backs up SeaweedFS Docker volumes to a timestamped directory.
# Supports both the rehearsal cluster (project 'seaweedfs') and the bare-metal
# stack (project 'watzappa'). Set SEAWEEDFS_COMPOSE_PROJECT to override.

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

# Docker Compose names volumes differently depending on the project and whether
# the compose file uses an explicit short name or a long name. We accept either
# {project}_{name} or {project}_{name}_data.
find_volume() {
  local short_name="$1"
  local candidate1="${PROJECT_NAME}_${short_name}"
  local candidate2="${PROJECT_NAME}_${short_name}_data"

  if docker volume inspect "$candidate1" > /dev/null 2>&1; then
    echo "$candidate1"
  elif docker volume inspect "$candidate2" > /dev/null 2>&1; then
    echo "$candidate2"
  else
    echo ""
  fi
}

require_volume() {
  local short_name="$1"
  local volume
  volume="$(find_volume "$short_name")"
  if [ -z "$volume" ]; then
    echo "Missing Docker volume for '${short_name}'. Tried:" >&2
    echo "  ${PROJECT_NAME}_${short_name}" >&2
    echo "  ${PROJECT_NAME}_${short_name}_data" >&2
    echo "Start the cluster first or set SEAWEEDFS_COMPOSE_PROJECT." >&2
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
  volume="$(find_volume "$short_name")"
  require_volume "$short_name"
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
seaweed_image=chrislusf/seaweedfs:4.37
source=${SCRIPT_DIR}
volumes=${PROJECT_NAME}_seaweed_master,${PROJECT_NAME}_seaweed_volume,${PROJECT_NAME}_seaweed_filer
EOF

echo ""
echo "Backup complete:"
du -sh "$BACKUP_DIR"
find "$BACKUP_DIR" -maxdepth 1 -type f -print
