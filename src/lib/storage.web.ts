import AsyncStorage from '@react-native-async-storage/async-storage'

/**
 * Web storage. `expo-secure-store` has no web implementation: its JS module
 * resolves and imports fine in the browser bundle, but every method delegates
 * to a native module that isn't there, so the first call fails with
 * `getValueWithKeyAsync is not a function`. A try/catch around the `require`
 * cannot detect that — the require is exactly the part that succeeds.
 *
 * On web this is AsyncStorage, which means `localStorage`. That is NOT secure
 * storage: anything written here is readable by any script on the origin and
 * survives in plain text. Only values that may live in `localStorage` belong
 * in this module on web — a device id is fine, Matrix access tokens and key
 * material are not.
 */
export async function setItemAsync(key: string, value: string): Promise<void> {
  return AsyncStorage.setItem(key, value)
}

export async function getItemAsync(key: string): Promise<string | null> {
  return AsyncStorage.getItem(key)
}

export async function deleteItemAsync(key: string): Promise<void> {
  return AsyncStorage.removeItem(key)
}
