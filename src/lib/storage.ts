import AsyncStorage from '@react-native-async-storage/async-storage'

// Jest has no native SecureStore module — fall back to AsyncStorage in tests.
const IS_TEST = process.env.NODE_ENV === 'test'

let SecureStore: typeof import('expo-secure-store') | null = null
if (!IS_TEST) {
  try {
    SecureStore = require('expo-secure-store')
  } catch {
    // expo-secure-store not resolvable at all.
  }
}

/**
 * A resolvable `expo-secure-store` does not mean a usable one. The JS module
 * loads wherever the bundler can find it, while every method delegates to a
 * native module that may be absent — on Expo Go, or in a dev build without the
 * config plugin — and the call then fails with
 * `getValueWithKeyAsync is not a function` from inside the package. There is no
 * synchronous way to tell the two apart at import time, so the first failure
 * demotes this module to AsyncStorage for the rest of the session instead of
 * surfacing a native-module error to a caller that only asked for a value.
 *
 * Web does not take this path at all: see storage.web.ts.
 */
let secureStoreUsable = true

function demote(key: string, err: unknown): void {
  secureStoreUsable = false
  // eslint-disable-next-line no-console
  console.warn(
    `storage: expo-secure-store is unusable (${String(
      err,
    )}); falling back to AsyncStorage. Values written from here on are NOT in secure storage.`,
    {key},
  )
}

function useSecureStore(): boolean {
  return SecureStore !== null && secureStoreUsable
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  if (useSecureStore()) {
    try {
      return await SecureStore!.setItemAsync(key, value)
    } catch (err) {
      demote(key, err)
    }
  }
  return AsyncStorage.setItem(key, value)
}

export async function getItemAsync(key: string): Promise<string | null> {
  if (useSecureStore()) {
    try {
      return await SecureStore!.getItemAsync(key)
    } catch (err) {
      demote(key, err)
    }
  }
  return AsyncStorage.getItem(key)
}

export async function deleteItemAsync(key: string): Promise<void> {
  if (useSecureStore()) {
    try {
      return await SecureStore!.deleteItemAsync(key)
    } catch (err) {
      demote(key, err)
    }
  }
  return AsyncStorage.removeItem(key)
}
