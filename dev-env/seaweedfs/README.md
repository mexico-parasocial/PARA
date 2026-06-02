# SeaweedFS × PARA Dev Environment

**Verdict:** SeaweedFS is a strong, low-risk replacement for Cloudflare R2 because the PDS already speaks S3. The integration is almost entirely config changes — zero code changes needed for Phase 1.

This dev cluster pins SeaweedFS to `chrislusf/seaweedfs:4.31`. Avoid `latest` for alpha or production rehearsals so storage behavior does not change between deploys.

## Architecture

```
┌─────────────┐     S3 API      ┌─────────────────────────────────────────┐
│   PDS       │ ◄──────────────►│  SeaweedFS S3 Gateway  (port 8333)     │
│  (dev-env)  │   forcePathStyle│  SeaweedFS Filer       (port 8888)     │
└─────────────┘                 │  SeaweedFS Volume      (port 8080)     │
                                │  SeaweedFS Master      (port 9333)     │
                                └─────────────────────────────────────────┘
```

- **Blob metadata** stays in SQLite (PDS default).
- **Blob bytes** move from local disk → SeaweedFS S3 gateway.
- **AppView** still doesn't store blobs (Phase 2 can consolidate its image cache).

## Quick Start

```bash
cd dev-env/seaweedfs

# 1. Copy env template
cp .env.seaweedfs.example .env.seaweedfs

# 2. Spin up the 4-service cluster
docker compose -f docker-compose.seaweedfs.yml up --wait

# 3. Create the S3 bucket
./init-bucket.sh

# 4. Run diagnostics (smoke test + health check)
./diagnose.sh

# 5. Run the PDS test suite against SeaweedFS
./run-pds-tests.sh

# 6. Tear down when done
docker compose -f docker-compose.seaweedfs.yml down -v
```

## File Inventory

| File | Purpose |
|------|---------|
| `docker-compose.seaweedfs.yml` | 4-service SeaweedFS cluster (master, volume, filer, s3) |
| `s3-config.json` | Static credentials & bucket ACL for dev |
| `.env.seaweedfs.example` | Env var template for PDS + SeaweedFS |
| `init-bucket.sh` | Idempotent bucket creation |
| `diagnose.sh` | Full-stack health check + PUT/GET/DELETE smoke test |
| `run-pds-tests.sh` | Orchestrates cluster → tests → teardown |
| `seaweed-up.sh` | Starts the local 4.31 cluster, initializes the bucket, and runs diagnostics |
| `seaweed-backup.sh` | Backs up local Seaweed Docker volumes to the Mac mini backup directory |
| `seaweed-restore-drill.sh` | Restores a backup into a separate high-port drill project |
| `switch-storage-preview.sh` | Prints R2/Seaweed env differences without editing production config |
| `storage.*.env.example` | Safe profile examples for R2 and local Seaweed |
| `../../patches/@atproto+dev-env+0.4.7.patch` | Patches `TestPds.create()` to read S3 env vars |

## How the Patch Works

`@atproto/dev-env`'s `TestPds.create()` hardcodes a temp-disk blobstore. The patch makes it check `DEV_ENV_PDS_BLOBSTORE_S3_BUCKET`:

- **If set** → skips disk blobstore, injects S3 config into the PDS env object.
- **If unset** → behaves exactly as before (backward compatible).

This means the existing PDS test suite (`jest tests/`) runs unmodified against SeaweedFS.

## Debugging Infrastructure

> *"Es mejor prevenir que lamentar."*

Every service includes:

- **Healthchecks** in Docker Compose (`wget` against status endpoints)
- **Log rotation** (`json-file` driver, 50 MB max, 3 files)
- **Metrics endpoints** on each component (ports `9324–9327`)
- **`diagnose.sh`** — one-command status report:
  - Docker service health
  - Master cluster status
  - Volume / Filer / S3 gateway reachability
  - S3 bucket accessibility
  - End-to-end smoke test (PUT → GET → DELETE)
  - Recent error logs
  - Container resource usage

To enable Prometheus scraping, uncomment the `prometheus` service in the compose file.

## Environment Variables

### SeaweedFS

| Var | Default | Description |
|-----|---------|-------------|
| `SEAWEEDFS_S3_ENDPOINT` | `http://localhost:8333` | S3 gateway URL |
| `SEAWEEDFS_ACCESS_KEY` | `weed` | S3 access key |
| `SEAWEEDFS_SECRET_KEY` | `weed_secret` | S3 secret key |
| `SEAWEEDFS_BUCKET` | `blobs` | Bucket name |

### PDS Blobstore (read by patched dev-env)

| Var | Default | Description |
|-----|---------|-------------|
| `DEV_ENV_PDS_BLOBSTORE_S3_BUCKET` | `blobs` | S3 bucket for PDS blobs |
| `DEV_ENV_PDS_BLOBSTORE_S3_REGION` | `us-east-1` | AWS-style region |
| `DEV_ENV_PDS_BLOBSTORE_S3_ENDPOINT` | `http://localhost:8333` | S3-compatible endpoint |
| `DEV_ENV_PDS_BLOBSTORE_S3_FORCE_PATH_STYLE` | `true` | Required for SeaweedFS/MinIO |
| `DEV_ENV_PDS_BLOBSTORE_S3_ACCESS_KEY_ID` | `weed` | Access key |
| `DEV_ENV_PDS_BLOBSTORE_S3_SECRET_ACCESS_KEY` | `weed_secret` | Secret key |

## Running Specific Tests

```bash
# Run only blob-related tests
./run-pds-tests.sh --testPathPattern="blob"

# Run a single test file
./run-pds-tests.sh tests/file-uploads.test.ts

# Run with watch mode (keeps SeaweedFS up)
./run-pds-tests.sh --watch
```

## Web UIs

| Service | URL | Purpose |
|---------|-----|---------|
| Master | http://localhost:9333 | Volume topology, cluster status |
| Filer  | http://localhost:8888 | Browse files & metadata |
| S3     | http://localhost:8333 | S3 API endpoint |

## Roadmap

| Phase | Scope | Effort | Risk |
|-------|-------|--------|------|
| **1** (this PR) | Blob Store: Replace R2 with SeaweedFS S3 for PDS blobs in dev | 1–2 weeks | Low |
| **2** | Consolidation: AppView image cache, log archives, PLC snapshots | 1–2 months | Medium |

Production stays on **R2** until scale justifies the switch or multi-DC replication is needed.
