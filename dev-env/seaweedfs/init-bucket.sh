#!/usr/bin/env bash
set -euo pipefail

# init-bucket.sh
# Creates the S3 bucket on SeaweedFS if it doesn't already exist.
# SeaweedFS S3 gateway auto-creates buckets on first PUT, but PDS
# expects the bucket to exist at startup. This script idempotently
# ensures it.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.seaweedfs.yml"

S3_ENDPOINT="${SEAWEEDFS_S3_ENDPOINT:-http://localhost:8333}"
ACCESS_KEY="${SEAWEEDFS_ACCESS_KEY:-weed}"
SECRET_KEY="${SEAWEEDFS_SECRET_KEY:-weed_secret}"
BUCKET="${SEAWEEDFS_BUCKET:-blobs}"
REGION="${SEAWEEDFS_REGION:-us-east-1}"

echo "⏳ Waiting for SeaweedFS S3 gateway at ${S3_ENDPOINT} ..."
for i in {1..60}; do
  STATUS=$(curl -s -o /dev/null -w '%{http_code}' "${S3_ENDPOINT}/" 2>/dev/null || echo "000")
  if [ "$STATUS" = "200" ] || [ "$STATUS" = "403" ]; then
    echo "✅ S3 gateway is up"
    break
  fi
  if [ "$i" -eq 60 ]; then
    echo "❌ S3 gateway did not become ready in time"
    exit 1
  fi
  sleep 1
done

echo "📦 Creating bucket '${BUCKET}' (if not exists) ..."

# Use AWS CLI if available, otherwise fall back to curl + s3v4 sig
if command -v aws &> /dev/null; then
  AWS_ACCESS_KEY_ID="${ACCESS_KEY}" \
  AWS_SECRET_ACCESS_KEY="${SECRET_KEY}" \
  aws --endpoint-url "${S3_ENDPOINT}" \
      s3 mb "s3://${BUCKET}" \
      --region "${REGION}" 2>/dev/null || true
else
  # Simple PUT bucket via curl (SeaweedFS is lenient with auth)
  curl -sf -X PUT "${S3_ENDPOINT}/${BUCKET}" \
       -H "Authorization: AWS ${ACCESS_KEY}:${SECRET_KEY}" \
       > /dev/null 2>&1 || true
fi

echo "🔍 Verifying bucket ..."
if command -v aws &> /dev/null; then
  AWS_ACCESS_KEY_ID="${ACCESS_KEY}" \
  AWS_SECRET_ACCESS_KEY="${SECRET_KEY}" \
  aws --endpoint-url "${S3_ENDPOINT}" \
      s3 ls "s3://${BUCKET}" \
      --region "${REGION}" > /dev/null 2>&1 && echo "✅ Bucket ready" || echo "⚠️  Bucket may not be fully ready yet"
else
  curl -sf "${S3_ENDPOINT}/${BUCKET}" > /dev/null 2>&1 && echo "✅ Bucket ready" || echo "⚠️  Bucket check inconclusive (install awscli for better diagnostics)"
fi

echo ""
echo "SeaweedFS S3 is configured:"
echo "  Endpoint:        ${S3_ENDPOINT}"
echo "  Bucket:          ${BUCKET}"
echo "  Region:          ${REGION}"
echo "  Access Key:      ${ACCESS_KEY}"
echo "  ForcePathStyle:  true"
