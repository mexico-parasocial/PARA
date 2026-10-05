import * as Storage from './credentialStorage'
import {type M8Tokens} from './types'

export const M8_SESSION_DID_KEY = 'm8_session_did'
export const M8_PENDING_GRANT_KEY = 'm8_pending_grant'
export const M8_GRANT_ERROR_KEY = 'm8_grant_error'
let revision = 0
let activeDid: string | null | undefined
let writes: Promise<unknown> = Promise.resolve()
export const m8CredentialRevision = () => revision

function serialize<T>(work: () => Promise<T>): Promise<T> {
  const next = writes.catch(() => {}).then(work)
  writes = next
  return next
}
async function removeCredentials() {
  for (const key of [
    'm8_access_token',
    'm8_refresh_token',
    'm8_session_id',
    M8_SESSION_DID_KEY,
  ])
    await Storage.deleteItemAsync(key)
}
export function clearM8Credentials(): Promise<void> {
  revision++
  return serialize(async () => {
    await removeCredentials()
    await Storage.deleteItemAsync(M8_PENDING_GRANT_KEY)
  })
}
/** Invalidate in-flight grants immediately when PARA changes accounts. */
export function setM8ActiveAccount(did: string | undefined): Promise<void> {
  if (activeDid === (did ?? null)) return Promise.resolve()
  const previous = activeDid
  activeDid = did ?? null
  revision++
  return serialize(async () => {
    const bound = await Storage.getItemAsync(M8_SESSION_DID_KEY)
    if (!did || (bound && bound !== did)) await removeCredentials()
    if (previous !== undefined)
      await Storage.deleteItemAsync(M8_PENDING_GRANT_KEY)
  })
}
export async function readM8Credentials() {
  return serialize(async () => {
    const version = revision
    const [accessToken, refreshToken, did, sessionId] = await Promise.all([
      Storage.getItemAsync('m8_access_token'),
      Storage.getItemAsync('m8_refresh_token'),
      Storage.getItemAsync(M8_SESSION_DID_KEY),
      Storage.getItemAsync('m8_session_id'),
    ])
    return {accessToken, refreshToken, did, sessionId, version}
  })
}
export async function getBoundM8AccessToken(): Promise<string | null> {
  const credentials = await readM8Credentials()
  if (
    credentials.version !== revision ||
    (activeDid !== undefined && credentials.did !== activeDid)
  )
    return null
  return credentials.accessToken
}
export function storeM8Credentials(
  did: string,
  sessionId: string,
  tokens: M8Tokens,
  version: number,
  isCurrent: () => boolean = () => true,
): Promise<void> {
  return serialize(async () => {
    const valid = () =>
      version === revision &&
      isCurrent() &&
      (activeDid === undefined || activeDid === did)
    if (!valid()) throw new Error('M8_ACCOUNT_CHANGED')
    if (
      typeof sessionId !== 'string' ||
      !sessionId ||
      typeof tokens?.accessToken !== 'string' ||
      !tokens.accessToken ||
      typeof tokens.refreshToken !== 'string' ||
      !tokens.refreshToken
    )
      throw new Error('M8_INVALID_TOKENS')
    try {
      // @NOTE commit access last; all credential readers wait for this write queue.
      await Storage.deleteItemAsync('m8_access_token')
      await Storage.setItemAsync('m8_refresh_token', tokens.refreshToken)
      await Storage.setItemAsync('m8_session_id', sessionId)
      await Storage.setItemAsync(M8_SESSION_DID_KEY, did)
      await Storage.setItemAsync('m8_access_token', tokens.accessToken)
      if (!valid()) throw new Error('M8_ACCOUNT_CHANGED')
    } catch (error) {
      await removeCredentials()
      throw error
    }
  })
}

/** Snapshot for remote logout while invalidating grants synchronously. */
export function detachM8Credentials() {
  revision++
  return serialize(async () => {
    const [accessToken, refreshToken] = await Promise.all([
      Storage.getItemAsync('m8_access_token'),
      Storage.getItemAsync('m8_refresh_token'),
    ])
    await removeCredentials()
    await Storage.deleteItemAsync(M8_PENDING_GRANT_KEY)
    return {accessToken, refreshToken}
  })
}
export function bindLegacyM8Credentials(
  did: string,
  token: string,
  version: number,
) {
  return serialize(async () => {
    if (
      version !== revision ||
      (activeDid !== undefined && activeDid !== did) ||
      (await Storage.getItemAsync('m8_access_token')) !== token
    )
      throw new Error('M8_ACCOUNT_CHANGED')
    await Storage.setItemAsync(M8_SESSION_DID_KEY, did)
  })
}
export function storeM8PendingGrant(
  value: {attemptId: string},
  version: number,
) {
  return serialize(async () => {
    if (version !== revision) throw new Error('M8_ACCOUNT_CHANGED')
    await Storage.setItemAsync(M8_PENDING_GRANT_KEY, JSON.stringify(value))
  })
}
export function clearM8PendingGrant(attemptId: string) {
  return serialize(async () => {
    const raw = await Storage.getItemAsync(M8_PENDING_GRANT_KEY)
    const value: unknown = raw ? JSON.parse(raw) : null
    if (
      value &&
      typeof value === 'object' &&
      'attemptId' in value &&
      value.attemptId === attemptId
    )
      await Storage.deleteItemAsync(M8_PENDING_GRANT_KEY)
  })
}
