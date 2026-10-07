import AsyncStorage from '@react-native-async-storage/async-storage'

const credentialKeys = [
  'm8_access_token',
  'm8_refresh_token',
  'm8_session_id',
  'm8_session_did',
]
const credentials = new Map<string, string>()
// Retire bearer credentials persisted by the previous web implementation.
const retired = AsyncStorage.multiRemove(credentialKeys)

// Web bearer credentials stay in this runtime. Only the short-lived callback
// binding/error survives the full-page authorization round trip in this tab.
export async function getItemAsync(key: string): Promise<string | null> {
  await retired
  return credentialKeys.includes(key)
    ? (credentials.get(key) ?? null)
    : window.sessionStorage.getItem(key)
}
export async function setItemAsync(key: string, value: string): Promise<void> {
  await retired
  if (credentialKeys.includes(key)) credentials.set(key, value)
  else window.sessionStorage.setItem(key, value)
}
export async function deleteItemAsync(key: string): Promise<void> {
  await retired
  if (credentialKeys.includes(key)) credentials.delete(key)
  else window.sessionStorage.removeItem(key)
}
