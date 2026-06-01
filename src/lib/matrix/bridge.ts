import {getM8AccessToken, refreshM8AccessToken} from '#/lib/m8/api'

export const MATRIX_BRIDGE_API_URL =
  process.env.EXPO_PUBLIC_MATRIX_BRIDGE_URL || 'https://bridge.para.social'

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
  if (res.status !== 401) {
    return res
  }

  const refreshed = await refreshM8AccessToken()
  if (!refreshed) {
    return res
  }

  const newToken = await getM8AccessToken()
  if (newToken) {
    headers.Authorization = `Bearer ${newToken}`
  }
  return request()
}
