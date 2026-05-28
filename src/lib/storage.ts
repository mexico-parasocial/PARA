import AsyncStorage from '@react-native-async-storage/async-storage'

let SecureStore: typeof import('expo-secure-store') | null = null
try {
  SecureStore = require('expo-secure-store')
} catch {
  // expo-secure-store native module not available (Expo Go, dev, etc.)
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  if (SecureStore) {
    return SecureStore.setItemAsync(key, value)
  }
  return AsyncStorage.setItem(key, value)
}

export async function getItemAsync(key: string): Promise<string | null> {
  if (SecureStore) {
    return SecureStore.getItemAsync(key)
  }
  return AsyncStorage.getItem(key)
}

export async function deleteItemAsync(key: string): Promise<void> {
  if (SecureStore) {
    return SecureStore.deleteItemAsync(key)
  }
  return AsyncStorage.removeItem(key)
}
