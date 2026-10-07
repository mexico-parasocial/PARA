import * as SecureStore from 'expo-secure-store'

import * as DevelopmentStorage from '#/lib/storage'

// Release wallet credentials must not fall back to unencrypted AsyncStorage.
const backend =
  __DEV__ || process.env.NODE_ENV === 'test' ? DevelopmentStorage : SecureStore
export const getItemAsync = (key: string) => backend.getItemAsync(key)
export const setItemAsync = (key: string, value: string) =>
  backend.setItemAsync(key, value)
export const deleteItemAsync = (key: string) => backend.deleteItemAsync(key)
