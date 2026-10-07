import {M8_CALLBACK_PATH} from './authorization'
import {M8_GRANT_ERROR_KEY, M8_PENDING_GRANT_KEY} from './credentials'
import * as Storage from './credentialStorage'
import {finishM8Grant, type PendingM8Grant} from './grant'

/** Call after persisted PARA account initialization, before rendering the router. */
export async function completeM8WebGrant(
  activeDid: () => string | undefined,
): Promise<string | undefined> {
  if (window.location.pathname !== M8_CALLBACK_PATH) return undefined
  const callback = window.location.href
  window.history.replaceState(null, '', M8_CALLBACK_PATH)
  let returnPath = '/'
  try {
    const raw = await Storage.getItemAsync(M8_PENDING_GRANT_KEY)
    if (!raw) throw new Error('M8_NO_PENDING_GRANT')
    const pending = JSON.parse(raw) as PendingM8Grant
    if (
      typeof pending.returnPath === 'string' &&
      pending.returnPath.startsWith('/')
    ) {
      const target = new URL(pending.returnPath, window.location.origin)
      if (
        target.origin === window.location.origin &&
        target.pathname !== M8_CALLBACK_PATH
      )
        returnPath = target.pathname + target.search + target.hash
    }
    if (
      pending.returnTo !== `${window.location.origin}${M8_CALLBACK_PATH}` ||
      typeof pending.did !== 'string' ||
      typeof pending.attemptId !== 'string' ||
      !Number.isFinite(pending.expiresAt)
    )
      throw new Error('M8_INVALID_CALLBACK')
    await finishM8Grant(callback, pending, activeDid)
    await Storage.deleteItemAsync(M8_GRANT_ERROR_KEY)
  } catch (error) {
    const code =
      error instanceof Error && /^M8_|^OAUTH_EXCHANGE_/.test(error.message)
        ? error.message
        : 'M8_AUTHORIZATION_FAILED'
    await Storage.setItemAsync(M8_GRANT_ERROR_KEY, code)
  } finally {
    await Storage.deleteItemAsync(M8_PENDING_GRANT_KEY)
  }
  return returnPath
}
