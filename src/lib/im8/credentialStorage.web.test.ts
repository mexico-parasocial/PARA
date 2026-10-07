import AsyncStorage from '@react-native-async-storage/async-storage'

const originalWindow = global.window
beforeEach(async () => {
  await AsyncStorage.clear()
  const values = new Map<string, string>()
  Object.defineProperty(global, 'window', {
    configurable: true,
    value: {
      sessionStorage: {
        getItem: jest.fn((key: string) => values.get(key) ?? null),
        setItem: jest.fn((key: string, value: string) => {
          values.set(key, value)
        }),
        removeItem: jest.fn((key: string) => {
          values.delete(key)
        }),
      },
    },
  })
})
afterEach(() =>
  Object.defineProperty(global, 'window', {
    configurable: true,
    value: originalWindow,
  }),
)
it('retires old persisted credentials and keeps new bearer tokens out of browser storage', async () => {
  await AsyncStorage.setItem('m8_access_token', 'legacy')
  const storage = await import('./credentialStorage.web')
  expect(await storage.getItemAsync('m8_access_token')).toBeNull()
  expect(await AsyncStorage.getItem('m8_access_token')).toBeNull()
  await storage.setItemAsync('m8_access_token', 'access')
  await storage.setItemAsync('m8_refresh_token', 'refresh')
  expect(await storage.getItemAsync('m8_access_token')).toBe('access')
  expect(window.sessionStorage.setItem).not.toHaveBeenCalled()
  expect(await AsyncStorage.getItem('m8_access_token')).toBeNull()
  await storage.deleteItemAsync('m8_access_token')
  expect(await storage.getItemAsync('m8_access_token')).toBeNull()
})
it('keeps only a temporary grant binding in this tab for the full-page callback', async () => {
  const storage = await import('./credentialStorage.web')
  await storage.setItemAsync('m8_pending_grant', 'binding')
  expect(await storage.getItemAsync('m8_pending_grant')).toBe('binding')
  expect(await AsyncStorage.getItem('m8_pending_grant')).toBeNull()
  await storage.deleteItemAsync('m8_pending_grant')
  expect(await storage.getItemAsync('m8_pending_grant')).toBeNull()
})
