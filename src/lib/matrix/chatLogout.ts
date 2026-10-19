import * as Crypto from 'expo-crypto'
import * as FileSystem from 'expo-file-system/legacy'
import * as SecureStore from 'expo-secure-store'

import * as Storage from '#/lib/storage'
import {
  chatAccountRevision,
  runChatLogout,
  waitForChatLogout,
} from './accountLifecycle'
import {requestDeadline} from './request'

type Device = {secretName: string; storeId: string}
let writes: Promise<unknown> = Promise.resolve()
function serialize<T>(work: () => Promise<T>): Promise<T> {
  const result = writes.catch(() => {}).then(work)
  writes = result
  return result
}
async function registryKey(did: string) {
  return `matrix.devices.${await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, did)}`
}
async function devices(key: string): Promise<Device[]> {
  const raw = await Storage.getItemAsync(key)
  const value: unknown = raw ? JSON.parse(raw) : []
  if (
    !Array.isArray(value) ||
    value.some(
      entry =>
        !entry ||
        !/^para\.matrix\.lab\.[a-f0-9]{64}$/.test(entry.secretName) ||
        !/^[a-f0-9]{64}$/.test(entry.storeId),
    )
  )
    throw new Error('CHAT_INVALID_DEVICE_REGISTRY')
  return value
}

/** Only metadata is indexed; session tokens and crypto keys remain in SecureStore. */
export async function trackChatDevice(
  did: string,
  device: Device,
  revision: number,
): Promise<void> {
  await waitForChatLogout(did)
  await serialize(async () => {
    if (chatAccountRevision(did) !== revision)
      throw new Error('CHAT_ACCOUNT_CHANGED')
    const key = await registryKey(did)
    const saved = await devices(key)
    if (chatAccountRevision(did) !== revision)
      throw new Error('CHAT_ACCOUNT_CHANGED')
    await Storage.setItemAsync(
      key,
      JSON.stringify([
        ...saved.filter(entry => entry.secretName !== device.secretName),
        device,
      ]),
    )
  })
}

export function saveChatDevice(
  did: string,
  secretName: string,
  value: string,
  revision: number,
): Promise<void> {
  return serialize(async () => {
    if (chatAccountRevision(did) !== revision)
      throw new Error('CHAT_ACCOUNT_CHANGED')
    await SecureStore.setItemAsync(secretName, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    })
    if (chatAccountRevision(did) !== revision) {
      await SecureStore.deleteItemAsync(secretName)
      throw new Error('CHAT_ACCOUNT_CHANGED')
    }
  })
}

export function logoutChatAccount(did: string): Promise<void> {
  return runChatLogout(did, () =>
    serialize(async () => {
      const key = await registryKey(did)
      const saved = await devices(key)
      const sessions: Array<{accessToken: string; homeserverUrl: string}> = []
      const failures: unknown[] = []
      for (const entry of saved) {
        try {
          const raw = await SecureStore.getItemAsync(entry.secretName)
          const session = raw ? JSON.parse(raw).session : undefined
          if (session?.accessToken && session?.homeserverUrl)
            sessions.push(session)
        } catch (error) {
          failures.push(error)
        }
        // @NOTE local removal still runs when the homeserver or a saved session is unavailable.
        for (const secret of [
          entry.secretName,
          `${entry.secretName}.pending-recovery`,
        ]) {
          try {
            await SecureStore.deleteItemAsync(secret)
          } catch (error) {
            failures.push(error)
          }
        }
        for (const base of [
          FileSystem.documentDirectory,
          FileSystem.cacheDirectory,
        ]) {
          if (base)
            try {
              await FileSystem.deleteAsync(
                `${base}matrix-lab/${entry.storeId}`,
                {idempotent: true},
              )
            } catch (error) {
              failures.push(error)
            }
        }
      }
      if (!failures.length) await Storage.deleteItemAsync(key)
      for (const session of sessions) {
        const deadline = requestDeadline()
        try {
          const response = await fetch(
            `${session.homeserverUrl.replace(/\/$/, '')}/_matrix/client/v3/logout`,
            {
              method: 'POST',
              headers: {Authorization: `Bearer ${session.accessToken}`},
              signal: deadline.signal,
            },
          )
          if (!response.ok && response.status !== 401)
            failures.push(new Error('CHAT_REMOTE_LOGOUT_UNAVAILABLE'))
        } catch (error) {
          failures.push(error)
        } finally {
          deadline.dispose()
        }
      }
      if (failures.length) throw new Error('CHAT_LOGOUT_INCOMPLETE')
    }),
  )
}
