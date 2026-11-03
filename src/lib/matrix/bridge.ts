import {
  clearM8Session,
  getM8AccessToken,
  refreshM8AccessToken,
} from '#/lib/im8/api'
import {m8CredentialRevision} from '#/lib/im8/credentials'
import {requestDeadline} from './request'

export const MATRIX_BRIDGE_API_URL =
  process.env.EXPO_PUBLIC_MATRIX_BRIDGE_URL || 'https://bridge.para.social'

export class BridgeAuthError extends Error {
  constructor(
    public statusCode: 401 | 403,
    message: string,
  ) {
    super(message)
    this.name = 'BridgeAuthError'
  }
}

/** Thrown before any request when this device holds no M8 session. */
export const M8_SESSION_REQUIRED = 'M8 session required'

export class BridgeResponseError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message)
    this.name = 'BridgeResponseError'
  }
}

export class BridgeUnavailableError extends Error {
  constructor() {
    super('Chat service unavailable')
    this.name = 'BridgeUnavailableError'
  }
}

export function isBridgeAuthError(error: unknown): error is BridgeAuthError {
  return error instanceof BridgeAuthError
}

/** The bridge's stable code for "this server runs without Matrix chat". */
export const CHAT_DISABLED = 'CHAT_DISABLED'

/**
 * The bridge answered 503 CHAT_DISABLED: chat is off on this server. Not an
 * outage and not worth retrying; chat surfaces should simply not show.
 */
export class ChatDisabledError extends Error {
  constructor() {
    super('Chat is not enabled on this server')
    this.name = 'ChatDisabledError'
  }
}

export function isChatDisabledError(
  error: unknown,
): error is ChatDisabledError {
  return error instanceof ChatDisabledError
}

/*
 * Bridge calls run from background polls (unread counts, sortition runs), so
 * an auth failure here must never navigate: a poll that yanks the user to
 * Home every few seconds is indistinguishable from a broken app. Callers get
 * a BridgeAuthError and decide what, if anything, to show.
 */
export async function matrixBridgeFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const version = m8CredentialRevision()
  const token = await getM8AccessToken()
  if (!token || version !== m8CredentialRevision()) {
    // Every bridge endpoint requires an M8 bearer token; asking without one
    // only produces a 401, so fail locally and leave the M8 state alone.
    throw new BridgeAuthError(401, M8_SESSION_REQUIRED)
  }
  const headers: Record<string, string> = {
    ...(options.body ? {'Content-Type': 'application/json'} : {}),
    Authorization: `Bearer ${token}`,
    ...(options.headers as Record<string, string> | undefined),
  }

  const request = async () => {
    const deadline = requestDeadline(options.signal ?? undefined)
    try {
      return await fetch(`${MATRIX_BRIDGE_API_URL}${path}`, {
        ...options,
        headers,
        signal: deadline.signal,
      })
    } catch (error) {
      if (options.signal?.aborted) throw error
      if (version !== m8CredentialRevision())
        throw new BridgeAuthError(401, M8_SESSION_REQUIRED)
      throw new BridgeUnavailableError()
    } finally {
      deadline.dispose()
    }
  }

  const res = await request()
  if (version !== m8CredentialRevision())
    throw new BridgeAuthError(401, M8_SESSION_REQUIRED)
  if (res.status === 401) {
    const refreshed = await refreshM8AccessToken()
    if (version !== m8CredentialRevision())
      throw new BridgeAuthError(401, M8_SESSION_REQUIRED)
    if (refreshed) {
      const newToken = await getM8AccessToken()
      if (newToken && version === m8CredentialRevision()) {
        headers.Authorization = `Bearer ${newToken}`
        return request()
      }
      throw new BridgeAuthError(401, M8_SESSION_REQUIRED)
    }
    // The token was rejected and cannot be refreshed: drop it so the next
    // login (or useEnsureM8Session) can mint a fresh one.
    await clearM8Session()
    const body = (await res.json().catch(() => ({}))) as {error?: string}
    throw new BridgeAuthError(401, body.error || 'Sesión expirada')
  }

  if (res.status === 403) {
    const body = (await res.json().catch(() => ({}))) as {error?: string}
    throw new BridgeAuthError(
      403,
      body.error || 'No tienes permiso para realizar esta acción',
    )
  }

  if (res.status === 503) {
    // Read a copy: other 503s (e.g. MATRIX_CLIENT_LOGIN_REQUIRED) are the
    // caller's to interpret.
    const body = (await res
      .clone()
      .json()
      .catch(() => ({}))) as {error?: string}
    if (body.error === CHAT_DISABLED) throw new ChatDisabledError()
  }

  return res
}
