import {chatAccountRevision} from './accountLifecycle'
import {logoutChatAccount, saveChatDevice, trackChatDevice} from './chatLogout'

const mockSecrets = new Map<string, string>()
const mockRegistry = new Map<string, string>()
const mockDeleteFile = jest.fn(async (..._args: unknown[]) => {})
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: {SHA256: 'sha'},
  digestStringAsync: async (_: string, did: string) => `hash-${did}`,
}))
jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device-only',
  getItemAsync: async (key: string) => mockSecrets.get(key) ?? null,
  setItemAsync: async (key: string, value: string) => {
    mockSecrets.set(key, value)
  },
  deleteItemAsync: async (key: string) => {
    mockSecrets.delete(key)
  },
}))
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///documents/',
  cacheDirectory: 'file:///cache/',
  deleteAsync: (...args: unknown[]) => mockDeleteFile(...args),
}))
jest.mock('#/lib/storage', () => ({
  getItemAsync: async (key: string) => mockRegistry.get(key) ?? null,
  setItemAsync: async (key: string, value: string) => {
    mockRegistry.set(key, value)
  },
  deleteItemAsync: async (key: string) => {
    mockRegistry.delete(key)
  },
}))
const device = {
  secretName: `para.matrix.lab.${'a'.repeat(64)}`,
  storeId: 'b'.repeat(64),
}
const other = {
  secretName: `para.matrix.lab.${'c'.repeat(64)}`,
  storeId: 'd'.repeat(64),
}
const saved = JSON.stringify({
  session: {accessToken: 'test-token', homeserverUrl: 'https://matrix.example'},
})
beforeEach(() => {
  mockSecrets.clear()
  mockRegistry.clear()
  mockDeleteFile.mockClear()
})
afterEach(() => jest.restoreAllMocks())

it('removes indexed native credentials, recovery copy and stores even when remote logout fails', async () => {
  await trackChatDevice(
    'logout-alice',
    device,
    chatAccountRevision('logout-alice'),
  )
  await trackChatDevice('logout-bob', other, chatAccountRevision('logout-bob'))
  mockSecrets.set(device.secretName, saved)
  mockSecrets.set(`${device.secretName}.pending-recovery`, 'private-key')
  mockSecrets.set(other.secretName, saved)
  jest.spyOn(global, 'fetch').mockRejectedValue(new Error('offline'))
  await expect(logoutChatAccount('logout-alice')).rejects.toThrow(
    'CHAT_LOGOUT_INCOMPLETE',
  )
  expect(mockSecrets.has(device.secretName)).toBe(false)
  expect(mockSecrets.has(`${device.secretName}.pending-recovery`)).toBe(false)
  expect(mockSecrets.has(other.secretName)).toBe(true)
  expect(mockDeleteFile).toHaveBeenCalledTimes(2)
})
it('refuses a late credential save from the logged out account', async () => {
  const before = chatAccountRevision('logout-alice')
  await logoutChatAccount('logout-alice')
  await expect(
    saveChatDevice('logout-alice', device.secretName, saved, before),
  ).rejects.toThrow('CHAT_ACCOUNT_CHANGED')
  expect(mockSecrets.size).toBe(0)
})
