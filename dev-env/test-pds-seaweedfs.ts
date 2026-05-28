/**
 * test-pds-seaweedfs.ts
 *
 * Thin wrapper around test-pds.ts that injects SeaweedFS S3 blobstore
 * configuration into the TestNetwork / TestPds creation path.
 *
 * This works because of the @atproto/dev-env patch: when
 * DEV_ENV_PDS_BLOBSTORE_S3_BUCKET is set, TestPds skips the temp-disk
 * blobstore. We ALSO explicitly pass the S3 values in the PdsConfig so
 * they survive even if the env vars are not set.
 */

import {createServer as createBaseServer, type TestPDS} from './test-pds'

export {type TestPDS} from './test-pds'

const S3_CONFIG = {
  blobstoreDiskLocation: undefined as string | undefined,
  blobstoreS3Bucket: process.env.DEV_ENV_PDS_BLOBSTORE_S3_BUCKET,
  blobstoreS3Region:
    process.env.DEV_ENV_PDS_BLOBSTORE_S3_REGION || 'us-east-1',
  blobstoreS3Endpoint: process.env.DEV_ENV_PDS_BLOBSTORE_S3_ENDPOINT,
  blobstoreS3ForcePathStyle:
    process.env.DEV_ENV_PDS_BLOBSTORE_S3_FORCE_PATH_STYLE === 'true',
  blobstoreS3AccessKeyId: process.env.DEV_ENV_PDS_BLOBSTORE_S3_ACCESS_KEY_ID,
  blobstoreS3SecretAccessKey:
    process.env.DEV_ENV_PDS_BLOBSTORE_S3_SECRET_ACCESS_KEY,
}

export async function createServer(
  opts: {inviteRequired: boolean} = {inviteRequired: false},
): Promise<TestPDS> {
  console.log(
    '[test-pds-seaweedfs] Using SeaweedFS S3 blobstore:',
    S3_CONFIG.blobstoreS3Endpoint || 'env var not set – will fall back to disk',
  )
  return createBaseServer({
    ...opts,
    ...S3_CONFIG,
  })
}
