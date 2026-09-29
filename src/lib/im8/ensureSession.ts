import * as Storage from '#/lib/storage'
import {clearM8Session, getM8AccessToken, getMe, postSessionStart} from './api'

/** The PARA account DID the stored M8 tokens were issued for. */
export const M8_SESSION_DID_KEY = 'm8_session_did'

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
  const [token, boundDid] = await Promise.all([
    getM8AccessToken(),
    Storage.getItemAsync(M8_SESSION_DID_KEY),
  ])

  if (token && boundDid === did) return 'existing'

  if (token && !boundDid) {
    // Tokens minted before the binding existed (e.g. the M8 screen's manual
    // start): adopt them only if the broker says they are for this DID.
    const me = await getMe().catch(() => null)
    if (me?.session.did === did) {
      await Storage.setItemAsync(M8_SESSION_DID_KEY, did)
      return 'existing'
    }
  }

  if (token) await clearM8Session()

  const res = await postSessionStart(did)
  if (!res.tokens) return 'pending_oauth'
  await Storage.setItemAsync(M8_SESSION_DID_KEY, did)
  return 'started'
}
