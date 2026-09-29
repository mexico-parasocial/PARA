import * as WebBrowser from 'expo-web-browser'

import {IS_NATIVE} from '#/env'
import {
  clearM8Session,
  exchangeCodeFromReturnUrl,
  getCurrentSession,
  M8_OAUTH_RETURN_URL,
  postSessionExchange,
  postSessionStart,
  restoreM8Session,
} from './api'
import {type M8SessionStartResponse, type ProofBrokerSession} from './types'

/**
 * Starts an m8 session. In development m8 may answer with tokens at once
 * (dev token bootstrap). Otherwise it answers with an OAuth URL; on native the
 * request asks m8 to send the browser back to M8_OAUTH_RETURN_URL.
 */
export async function startM8Session(
  identifier: string,
): Promise<M8SessionStartResponse> {
  return postSessionStart(
    identifier,
    IS_NATIVE ? {returnTo: M8_OAUTH_RETURN_URL} : {},
  )
}

/**
 * Finishes the OAuth sign-in on native: opens it in an auth session, takes
 * the `exchange_code` from the return URL and swaps it for tokens. Resolves
 * false if the person cancelled.
 */
export async function completeM8OAuth(authUrl: string): Promise<boolean> {
  const result = await WebBrowser.openAuthSessionAsync(
    authUrl,
    M8_OAUTH_RETURN_URL,
  )
  if (result.type !== 'success') return false
  const code = exchangeCodeFromReturnUrl(result.url)
  if (!code) {
    throw new Error('m8 returned without an exchange code')
  }
  await postSessionExchange(code)
  return true
}

export async function fetchM8Session(): Promise<ProofBrokerSession> {
  return getCurrentSession()
}

export async function restoreM8SessionOrNull(): Promise<ProofBrokerSession | null> {
  return restoreM8Session()
}

export async function logoutM8() {
  await clearM8Session()
}
