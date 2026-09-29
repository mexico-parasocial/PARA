import {
  clearM8Session,
  getM8AccessToken,
  refreshM8AccessToken,
} from '#/lib/im8/api'

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

export function isBridgeAuthError(error: unknown): error is BridgeAuthError {
  return error instanceof BridgeAuthError
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
  const token = await getM8AccessToken()
  if (!token) {
    // Every bridge endpoint requires an M8 bearer token; asking without one
    // only produces a 401, so fail locally and leave the M8 state alone.
    throw new BridgeAuthError(401, M8_SESSION_REQUIRED)
  }
  const headers: Record<string, string> = {
    ...(options.body ? {'Content-Type': 'application/json'} : {}),
    Authorization: `Bearer ${token}`,
    ...(options.headers as Record<string, string> | undefined),
  }

  const request = () =>
    fetch(`${MATRIX_BRIDGE_API_URL}${path}`, {
      ...options,
      headers,
    })

  const res = await request()
  if (res.status === 401) {
    const refreshed = await refreshM8AccessToken()
    if (refreshed) {
      const newToken = await getM8AccessToken()
      if (newToken) {
        headers.Authorization = `Bearer ${newToken}`
      }
      return request()
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

  return res
}
