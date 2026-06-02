#!/usr/bin/env bash
set -euo pipefail

# Restores a SeaweedFS backup into a fresh local compose project and verifies
# the restored S3 gateway on high ports, avoiding collisions with the normal
# local cluster.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_ROOT="${SEAWEEDFS_BACKUP_ROOT:-/Users/mlv/Backups/para/seaweedfs}"
RESTORE_ROOT="${SEAWEEDFS_RESTORE_ROOT:-${SCRIPT_DIR}/restore-drills}"

BACKUP_DIR="${1:-}"
if [ -z "$BACKUP_DIR" ]; then
  BACKUP_DIR="$(find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | sort | tail -1 || true)"
fi

if [ -z "$BACKUP_DIR" ] || [ ! -d "$BACKUP_DIR" ]; then
  echo "No backup directory found. Pass one explicitly or run seaweed-backup.sh first." >&2
  exit 1
fi

for f in seaweed_master.tar.gz seaweed_volume.tar.gz seaweed_filer.tar.gz; do
  if [ ! -f "${BACKUP_DIR}/${f}" ]; then
    echo "Backup is missing ${f}: ${BACKUP_DIR}" >&2
    exit 1
  fi
done

TIMESTAMP="$(date -u +%Y%m%d_%H%M%S)"
PROJECT_NAME="seaweedfs_restore_${TIMESTAMP}"
DRILL_DIR="${RESTORE_ROOT}/${TIMESTAMP}"
RESTORE_COMPOSE_FILE="${DRILL_DIR}/docker-compose.restore.yml"
S3_ENDPOINT="http://localhost:18333"
BUCKET="${SEAWEEDFS_BUCKET:-blobs}"

mkdir -p "$DRILL_DIR"

cat > "$RESTORE_COMPOSE_FILE" <<EOF
services:
  master:
    image: chrislusf/seaweedfs:4.31
    command: >
      master
      -ip=master
      -port=9333
      -mdir=/data
      -defaultReplication=000
      -metricsPort=9324
    ports:
      - "19333:9333"
      - "19324:9324"
    volumes:
      - seaweed_master:/data

  volume:
    image: chrislusf/seaweedfs:4.31
    command: >
      volume
      -mserver=master:9333
      -ip=volume
      -port=8080
      -dir=/data
      -max=100
      -metricsPort=9325
    ports:
      - "18080:8080"
      - "19325:9325"
    volumes:
      - seaweed_volume:/data
    depends_on:
      - master

  filer:
    image: chrislusf/seaweedfs:4.31
    command: >
      filer
      -master=master:9333
      -ip=filer
      -port=8888
      -metricsPort=9326
    ports:
      - "18890:8888"
      - "19326:9326"
      - "18889:18888"
    volumes:
      - seaweed_filer:/data
    depends_on:
      - master
      - volume

  s3:
    image: chrislusf/seaweedfs:4.31
    command: >
      s3
      -filer=filer:8888
      -ip.bind=0.0.0.0
      -port=8333
      -metricsPort=9327
      -config=/etc/seaweedfs/s3-config.json
    ports:
      - "18333:8333"
      - "19327:9327"
    volumes:
      - ${SCRIPT_DIR}/s3-config.json:/etc/seaweedfs/s3-config.json:ro
    depends_on:
      - filer

volumes:
  seaweed_master:
    external: true
    name: ${PROJECT_NAME}_seaweed_master
  seaweed_volume:
    external: true
    name: ${PROJECT_NAME}_seaweed_volume
  seaweed_filer:
    external: true
    name: ${PROJECT_NAME}_seaweed_filer
EOF

restore_volume() {
  local short_name="$1"
  local volume="${PROJECT_NAME}_${short_name}"
  docker volume create "$volume" > /dev/null
  docker run --rm \
    -v "${volume}:/data" \
    -v "${BACKUP_DIR}:/backup:ro" \
    alpine:3.20 \
    sh -c "cd /data && tar xzf /backup/${short_name}.tar.gz"
}

echo "═══════════════════════════════════════════════════════════════"
echo "  SeaweedFS Restore Drill"
echo "═══════════════════════════════════════════════════════════════"
echo "Backup:  $BACKUP_DIR"
echo "Project: $PROJECT_NAME"
echo "S3:      $S3_ENDPOINT"
echo ""

restore_volume "seaweed_master"
restore_volume "seaweed_volume"
restore_volume "seaweed_filer"

docker compose -p "$PROJECT_NAME" -f "$RESTORE_COMPOSE_FILE" up -d --wait

cleanup_hint() {
  echo ""
  echo "To clean up this restore drill:"
  echo "  docker compose -p $PROJECT_NAME -f $RESTORE_COMPOSE_FILE down -v"
}
trap cleanup_hint EXIT

echo ""
echo "Verifying restored endpoints ..."
wait_for_http() {
  local url="$1"
  local accepted="$2"
  local status

  for _ in {1..60}; do
    status=$(curl -s -o /dev/null -w '%{http_code}' "$url" 2>/dev/null || echo "000")
    if echo "$accepted" | tr ',' '\n' | grep -qx "$status"; then
      return 0
    fi
    sleep 1
  done

  echo "Endpoint failed readiness check: $url (last HTTP $status)" >&2
  return 1
}

wait_for_http "http://localhost:19333/cluster/status" "200"
wait_for_http "http://localhost:18080/status" "200"
wait_for_http "http://localhost:18890/?limit=1" "200"
S3_STATUS=$(curl -s -o /dev/null -w '%{http_code}' "$S3_ENDPOINT/" 2>/dev/null || echo "000")
if [ "$S3_STATUS" != "200" ] && [ "$S3_STATUS" != "403" ]; then
  echo "Restored S3 gateway failed health check: HTTP $S3_STATUS" >&2
  exit 1
fi

if command -v aws > /dev/null 2>&1; then
  AWS_ACCESS_KEY_ID="${SEAWEEDFS_ACCESS_KEY:-weed}" \
  AWS_SECRET_ACCESS_KEY="${SEAWEEDFS_SECRET_KEY:-weed_secret}" \
  aws --endpoint-url "$S3_ENDPOINT" s3 ls "s3://${BUCKET}" --region us-east-1 > /dev/null
  echo "Bucket listing OK: s3://${BUCKET}"
else
  echo "awscli not installed; endpoint health passed, bucket listing skipped."
fi

echo ""
echo "Restore drill passed."
