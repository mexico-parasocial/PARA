import {Platform} from 'react-native'

import {clearM8Session, exchangeM8Code, postSessionStart} from './api'
import {authorizeM8InBrowser, m8RedirectUri} from './authorization'
import {
  clearM8PendingGrant,
  m8CredentialRevision,
  storeM8Credentials,
  storeM8PendingGrant,
} from './credentials'
import {createM8ExchangeBinding} from './exchangeBinding'
import {type M8SessionStartResponse} from './types'

export type PendingM8Grant = {
  did: string
  attemptId: string
  returnTo: string
  expiresAt: number
  returnPath: string
  verifier: string
}

export async function finishM8Grant(
  url: string,
  pending: PendingM8Grant,
  activeDid: () => string | undefined,
  version = m8CredentialRevision(),
) {
  if (Date.now() >= pending.expiresAt) throw new Error('M8_LOGIN_EXPIRED')
  if (activeDid() !== pending.did || version !== m8CredentialRevision())
    throw new Error('M8_ACCOUNT_CHANGED')
  const callback = new URL(url)
  const target = new URL(pending.returnTo)
  if (
    callback.protocol !== target.protocol ||
    callback.host !== target.host ||
    callback.pathname !== target.pathname ||
    callback.hash ||
    callback.username ||
    callback.password
  )
    throw new Error('M8_INVALID_CALLBACK')
  if (
    callback.searchParams.getAll('attempt_id').length !== 1 ||
    callback.searchParams.get('attempt_id') !== pending.attemptId
  )
    throw new Error('M8_ATTEMPT_MISMATCH')
  if (callback.searchParams.has('error'))
    throw new Error('M8_AUTHORIZATION_FAILED')
  const codes = callback.searchParams.getAll('exchange_code')
  if (codes.length !== 1 || !/^m8ex-[A-Za-z0-9_-]{43}$/.test(codes[0]))
    throw new Error('M8_INVALID_CALLBACK')
  if (
    typeof pending.verifier !== 'string' ||
    !/^[A-Za-z0-9._~-]{43,128}$/.test(pending.verifier)
  )
    throw new Error('M8_INVALID_CALLBACK')
  const result = await exchangeM8Code(
    codes[0],
    pending.attemptId,
    pending.verifier,
  )
  if (
    !result.authenticated ||
    result.attemptId !== pending.attemptId ||
    result.session?.did !== pending.did ||
    result.session.sessionId !== result.sessionId
  )
    throw new Error('M8_ACCOUNT_MISMATCH')
  await storeM8Credentials(
    pending.did,
    result.sessionId,
    result.tokens,
    version,
    () => activeDid() === pending.did,
  )
  await clearM8PendingGrant(pending.attemptId)
  return result
}

/** Only an explicit Connect action opens the browser, never a background hook. */
async function connectM8Session(
  did: string,
  activeDid: () => string | undefined,
): Promise<M8SessionStartResponse> {
  if (activeDid() !== did) throw new Error('M8_ACCOUNT_CHANGED')
  await clearM8Session()
  const version = m8CredentialRevision()
  const returnTo = m8RedirectUri()
  const binding = await createM8ExchangeBinding()
  const response = await postSessionStart(did, {
    platform: Platform.OS === 'web' ? 'web' : 'mobile',
    returnTo,
    exchangeChallenge: binding.challenge,
  })
  if (activeDid() !== did || version !== m8CredentialRevision())
    throw new Error('M8_ACCOUNT_CHANGED')
  if (response.tokens) {
    if (
      response.session?.did !== did ||
      !response.attempt.sessionId ||
      response.session.sessionId !== response.attempt.sessionId
    )
      throw new Error('M8_ACCOUNT_MISMATCH')
    await storeM8Credentials(
      did,
      response.attempt.sessionId,
      response.tokens,
      version,
      () => activeDid() === did,
    )
    return response
  }
  const url = response.oauthUrl ?? response.attempt.authUrl
  const parsed = new URL(url)
  if (
    parsed.protocol !== 'https:' &&
    !(
      __DEV__ &&
      parsed.protocol === 'http:' &&
      ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)
    )
  )
    throw new Error('M8_INVALID_AUTHORIZATION_URL')
  if (
    parsed.username ||
    parsed.password ||
    response.attempt.returnTo !== returnTo ||
    response.attempt.exchangeChallenge !== binding.challenge ||
    !response.attempt.attemptId
  )
    throw new Error('M8_HANDOFF_NOT_CONFIGURED')
  const expiresAt = Date.parse(response.attempt.expiresAt ?? '')
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now())
    throw new Error('M8_LOGIN_EXPIRED')
  const pending: PendingM8Grant = {
    did,
    attemptId: response.attempt.attemptId,
    returnTo,
    expiresAt,
    verifier: binding.verifier,
    returnPath: Platform.OS === 'web' ? window.location.pathname : '/',
  }
  await storeM8PendingGrant(pending, version)
  try {
    if (activeDid() !== did || version !== m8CredentialRevision())
      throw new Error('M8_ACCOUNT_CHANGED')
    const callback = await authorizeM8InBrowser(url, expiresAt)
    if (!callback) return response
    const result = await finishM8Grant(callback, pending, activeDid, version)
    return {
      ...response,
      tokens: result.tokens,
      session: result.session,
      attempt: {...response.attempt, sessionId: result.sessionId},
    }
  } catch (error) {
    await clearM8PendingGrant(pending.attemptId)
    throw error
  }
}

let connecting = false
export async function connectM8SessionFor(
  did: string,
  activeDid: () => string | undefined,
): Promise<M8SessionStartResponse> {
  if (connecting) throw new Error('M8_LOGIN_IN_PROGRESS')
  connecting = true
  try {
    return await connectM8Session(did, activeDid)
  } finally {
    connecting = false
  }
}
