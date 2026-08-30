import {clearM8Session, getM8AccessToken, refreshM8AccessToken} from '#/lib/im8/api'
import {navigate} from '#/Navigation'

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

export async function matrixBridgeFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = await getM8AccessToken()
  const headers: Record<string, string> = {
    ...(options.body ? {'Content-Type': 'application/json'} : {}),
    ...(token ? {Authorization: `Bearer ${token}`} : {}),
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
    await clearM8Session()
    void navigate('Home')
    const body = (await res.json().catch(() => ({}))) as {error?: string}
    throw new BridgeAuthError(401, body.error || 'Sesión expirada')
  }

  if (res.status === 403) {
    const body = (await res.json().catch(() => ({}))) as {error?: string}
    throw new BridgeAuthError(403, body.error || 'No tienes permiso para realizar esta acción')
  }

  return res
}
