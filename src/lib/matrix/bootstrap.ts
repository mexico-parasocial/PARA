import {ensureMatrixProofSignerInstalled} from '#/lib/matrix/im8Signer'
import {BRIDGE_AUDIENCES, bridgeCallWithProof} from '#/lib/matrix/proofs'
import {logger} from '#/logger'

/**
 * W1d — CD-M6 bootstrap: bring the app's Matrix identity fully online.
 *
 * Order matters and every step is proof-bearing (challenge → sign → call):
 *
 *   1. identity  — derivation cross-check + Synapse account provisioning
 *   2. attest    — when an actual Matrix device already exists, register its
 *                  device id so attribution and revocation can reach it
 *   3. join      — (re-)join every community the user is an active member
 *                  of. Idempotent; also the lease re-entry path after the
 *                  bridge's TTL sweep kicked an inactive account.
 *
 * Steps 2 and 3 fail soft (logged, reported) — partial boot is useful and
 * the next foreground retries. Step 1 failing is fatal to chat and is
 * returned as the typed failure the UI handles.
 * A local install id must never be attested as a MAS device id: MAS chooses
 * the device during OIDC, and that id is only known after authorization.
 */

export interface MatrixBootstrapInput {
  /** Actual Matrix device id, if a client-managed session already exists. */
  deviceId?: string
  friendlyName?: string
  /** Communities the user is an active member of, from app state. */
  communityUris: string[]
}

export interface MatrixBootstrapResult {
  userId: string
  homeServer: string
  attestedDeviceId?: string
  joined: string[]
  failedJoins: Array<{communityUri: string; error: string}>
}

export async function bootstrapMatrixIdentity(
  input: MatrixBootstrapInput,
): Promise<MatrixBootstrapResult> {
  ensureMatrixProofSignerInstalled()

  const identity = await bridgeCallWithProof<{
    userId: string
    homeServer: string
  }>(BRIDGE_AUDIENCES.identity, '/api/matrix-identity')
  logger.info('matrix: identity derived from verified proof', {
    userId: identity.userId,
  })

  let attestedDeviceId: string | undefined
  if (input.deviceId) {
    try {
      const attest = await bridgeCallWithProof<{deviceId: string}>(
        BRIDGE_AUDIENCES.attest,
        '/api/matrix-attest',
        {deviceId: input.deviceId, friendlyName: input.friendlyName},
      )
      attestedDeviceId = attest.deviceId
    } catch (err) {
      logger.warn(
        'matrix: attestation failed; moderation/revocation will not reach this device until it attests',
        {err},
      )
    }
  }

  const joined: string[] = []
  const failedJoins: Array<{communityUri: string; error: string}> = []
  for (const communityUri of input.communityUris) {
    try {
      const join = await bridgeCallWithProof<{spaceId: string}>(
        BRIDGE_AUDIENCES.join,
        '/api/community-join',
        {communityUri},
      )
      joined.push(join.spaceId)
    } catch (err) {
      // Not-yet-provisioned community spaces 404 here routinely; the
      // membership.changed handler retries the join when it lands.
      failedJoins.push({
        communityUri,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }
  logger.info('matrix: bootstrap join pass complete', {
    joined: joined.length,
    failed: failedJoins.length,
  })

  return {
    userId: identity.userId,
    homeServer: identity.homeServer,
    attestedDeviceId,
    joined,
    failedJoins,
  }
}

/**
 * Lease re-entry: call when the homeserver reports the account left a room
 * of a community the user still belongs to (the bridge's TTL sweep evicts
 * inactive accounts). Idempotent; active members are re-admitted.
 */
export async function rejoinCommunityRoom(communityUri: string): Promise<void> {
  ensureMatrixProofSignerInstalled()
  await bridgeCallWithProof(BRIDGE_AUDIENCES.join, '/api/community-join', {
    communityUri,
  })
}
