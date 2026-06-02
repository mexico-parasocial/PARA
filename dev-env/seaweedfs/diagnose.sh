#!/usr/bin/env bash
set -uo pipefail

# diagnose.sh
# Health-check every layer of the SeaweedFS stack.
# Run this when uploads fail, tests hang, or you smell smoke.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.seaweedfs.yml"

S3_ENDPOINT="${SEAWEEDFS_S3_ENDPOINT:-http://localhost:8333}"
ACCESS_KEY="${SEAWEEDFS_ACCESS_KEY:-weed}"
SECRET_KEY="${SEAWEEDFS_SECRET_KEY:-weed_secret}"
BUCKET="${SEAWEEDFS_BUCKET:-blobs}"

echo "═══════════════════════════════════════════════════════════════"
echo "  SeaweedFS Diagnostics – $(date -Iseconds)"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# ── Docker Compose status ─────────────────────────────────────
echo "🐋 Docker Compose service status:"
docker compose -f "${COMPOSE_FILE}" ps --format "table {{.Service}}\t{{.Status}}\t{{.Health}}"
echo ""

# ── Master cluster status ─────────────────────────────────────
echo "🧠 Master cluster status:"
curl -sf http://localhost:9333/cluster/status 2>/dev/null | python3 -m json.tool 2>/dev/null || echo "  ⚠️  Master not responding on :9333"
echo ""

# ── Volume server status ──────────────────────────────────────
echo "💾 Volume server status:"
curl -sf http://localhost:8080/status 2>/dev/null | python3 -m json.tool 2>/dev/null || echo "  ⚠️  Volume not responding on :8080"
echo ""

# ── Filer status ──────────────────────────────────────────────
echo "📁 Filer (metadata) status:"
curl -sf http://localhost:8888/?limit=1 2>/dev/null > /dev/null && echo "  ✅ Filer responding on :8888" || echo "  ⚠️  Filer not responding on :8888"
echo ""

# ── S3 Gateway status ─────────────────────────────────────────
echo "🔑 S3 Gateway status:"
S3_STATUS=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:8333/ 2>/dev/null || echo "000")
if [ "$S3_STATUS" = "200" ] || [ "$S3_STATUS" = "403" ]; then
  echo "  ✅ S3 gateway responding on :8333 (HTTP $S3_STATUS)"
else
  echo "  ⚠️  S3 gateway not responding on :8333 (HTTP $S3_STATUS)"
fi
echo ""

# ── S3 bucket accessibility ───────────────────────────────────
echo "🪣 S3 Bucket '${BUCKET}' accessibility:"
if command -v aws &> /dev/null; then
  AWS_ACCESS_KEY_ID="${ACCESS_KEY}" \
  AWS_SECRET_ACCESS_KEY="${SECRET_KEY}" \
  aws --endpoint-url "${S3_ENDPOINT}" s3 ls "s3://${BUCKET}" --region us-east-1 > /dev/null 2>&1 && echo "  ✅ Bucket accessible" || echo "  ❌ Bucket NOT accessible"
else
  echo "  ℹ️  awscli not installed – skipping deep bucket check"
fi
echo ""

# ── End-to-end smoke test ─────────────────────────────────────
echo "💨 Smoke test (PUT + GET + DELETE):"
SMOKE_KEY="diag-smoke-$(date +%s).txt"
SMOKE_DATA="smoke-test-$(uuidgen 2>/dev/null || date +%s)"

if command -v aws &> /dev/null; then
  if echo "${SMOKE_DATA}" | AWS_ACCESS_KEY_ID="${ACCESS_KEY}" AWS_SECRET_ACCESS_KEY="${SECRET_KEY}" aws --endpoint-url "${S3_ENDPOINT}" s3 cp - "s3://${BUCKET}/${SMOKE_KEY}" --region us-east-1 > /dev/null 2>&1; then
    RETRIEVED=$(AWS_ACCESS_KEY_ID="${ACCESS_KEY}" AWS_SECRET_ACCESS_KEY="${SECRET_KEY}" aws --endpoint-url "${S3_ENDPOINT}" s3 cp "s3://${BUCKET}/${SMOKE_KEY}" - --region us-east-1 2>/dev/null)
    if [ "${RETRIEVED}" = "${SMOKE_DATA}" ]; then
      echo "  ✅ PUT/GET round-trip OK"
      AWS_ACCESS_KEY_ID="${ACCESS_KEY}" AWS_SECRET_ACCESS_KEY="${SECRET_KEY}" aws --endpoint-url "${S3_ENDPOINT}" s3 rm "s3://${BUCKET}/${SMOKE_KEY}" --region us-east-1 > /dev/null 2>&1
      echo "  ✅ Cleanup OK"
    else
      echo "  ❌ GET returned different data than PUT"
    fi
  else
    echo "  ❌ PUT failed"
  fi
else
  echo "  ℹ️  awscli not installed – skipping smoke test"
fi
echo ""

# ── Recent logs summary ───────────────────────────────────────
echo "📜 Recent error log lines (last 5 per service):"
for svc in master volume filer s3; do
  echo "  --- ${svc} ---"
  docker compose -f "${COMPOSE_FILE}" logs --tail=5 "${svc}" 2>/dev/null | grep -iE "error|warn|fatal" || echo "    (no errors)"
done
echo ""

# ── Resource usage ────────────────────────────────────────────
echo "🖥️  Container resource usage:"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" 2>/dev/null | grep -E "para-seaweed" || echo "  (docker stats unavailable)"
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "  Diagnostics complete"
echo "═══════════════════════════════════════════════════════════════"
