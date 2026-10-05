import {clearM8Session, postSessionStart, verifyLegacyM8Session} from './api'
import {
  bindLegacyM8Credentials,
  m8CredentialRevision,
  readM8Credentials,
  storeM8Credentials,
} from './credentials'
export {M8_SESSION_DID_KEY} from './credentials'

export type EnsureM8SessionResult =
  /** A token for this DID was already stored. */
  | 'existing'
  /** The broker issued tokens immediately (dev-token bootstrap). */
  | 'started'
  /** The broker requires the OAuth / iM8 handoff; nothing was stored. */
  | 'pending_oauth'

/*
 * Makes sure the M8 tokens on this device belong to `did`. The session is
 * started with the DID rather than the handle: the broker resolves handles
 * against its configured PDS, and in development it invents a DID for a
 * handle it cannot resolve, which the Matrix bridge then rejects as a DID
 * mismatch.
 */
export async function ensureM8SessionFor(
  did: string,
): Promise<EnsureM8SessionResult> {
  const {
    accessToken: token,
    did: boundDid,
    version: storedVersion,
  } = await readM8Credentials()

  if (token && boundDid === did) return 'existing'

  if (token && !boundDid) {
    // Tokens minted before the binding existed (e.g. the M8 screen's manual
    // start): adopt them only if the broker says they are for this DID.
    const me = await verifyLegacyM8Session(token).catch(() => null)
    if (me?.did === did) {
      await bindLegacyM8Credentials(did, token, storedVersion)
      return 'existing'
    }
  }

  if (token) await clearM8Session()

  const version = m8CredentialRevision()
  const res = await postSessionStart(did)
  if (!res.tokens) return 'pending_oauth'
  if (
    res.session?.did !== did ||
    !res.attempt.sessionId ||
    res.session.sessionId !== res.attempt.sessionId
  )
    throw new Error('M8_ACCOUNT_MISMATCH')
  await storeM8Credentials(did, res.attempt.sessionId, res.tokens, version)
  return 'started'
}
