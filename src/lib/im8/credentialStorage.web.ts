import AsyncStorage from '@react-native-async-storage/async-storage'

import {M8_COOKIE_REFRESH} from './refreshTransport'

const credentialKeys = [
  'm8_access_token',
  'm8_refresh_token',
  'm8_session_id',
  'm8_session_did',
]
// Not secrets: which session the broker's HttpOnly refresh cookie belongs to.
const persistentKeys: Record<string, string> = {
  m8_session_id: 'm8_web_session_id',
  m8_session_did: 'm8_web_session_did',
}
const COOKIE_MARKER_KEY = 'm8_web_refresh_cookie'
const credentials = new Map<string, string>()
// Retire bearer credentials persisted by the previous web implementation.
const retired = AsyncStorage.multiRemove(credentialKeys)

// Web bearer credentials stay in this runtime. The refresh token lives in the
// broker's HttpOnly cookie, so a reload keeps only a marker that it exists and
// the session it belongs to; a real refresh token (development bootstrap) is
// never written to browser storage. Only the short-lived callback
// binding/error survives the full-page authorization round trip in this tab.
export async function getItemAsync(key: string): Promise<string | null> {
  await retired
  if (credentials.has(key)) return credentials.get(key) ?? null
  if (key === 'm8_refresh_token')
    return window.localStorage.getItem(COOKIE_MARKER_KEY)
      ? M8_COOKIE_REFRESH
      : null
  if (key in persistentKeys)
    return window.localStorage.getItem(persistentKeys[key])
  return credentialKeys.includes(key)
    ? null
    : window.sessionStorage.getItem(key)
}
export async function setItemAsync(key: string, value: string): Promise<void> {
  await retired
  if (key === 'm8_refresh_token') {
    if (value === M8_COOKIE_REFRESH)
      window.localStorage.setItem(COOKIE_MARKER_KEY, '1')
    else window.localStorage.removeItem(COOKIE_MARKER_KEY)
  }
  if (key in persistentKeys)
    window.localStorage.setItem(persistentKeys[key], value)
  if (credentialKeys.includes(key)) credentials.set(key, value)
  else window.sessionStorage.setItem(key, value)
}
export async function deleteItemAsync(key: string): Promise<void> {
  await retired
  if (key === 'm8_refresh_token')
    window.localStorage.removeItem(COOKIE_MARKER_KEY)
  if (key in persistentKeys) window.localStorage.removeItem(persistentKeys[key])
  if (credentialKeys.includes(key)) credentials.delete(key)
  else window.sessionStorage.removeItem(key)
}
