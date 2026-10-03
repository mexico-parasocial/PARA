import {
  type ChatRecovery,
  type ChatSecurityStatus,
  type RecoveryKey,
} from './types'

/** The SDK and the device keychain stay behind this boundary. */
export interface RecoveryBackend {
  status(): Promise<ChatSecurityStatus>
  enable(): Promise<string>
  recover(key: string): Promise<void>
  sync(): Promise<void>
  loadPending(): Promise<string | null>
  savePending(key: string): Promise<void>
  clearPending(): Promise<void>
}

/** Serializes key mutations and never replaces an existing backup. */
export function createChatRecovery(backend: RecoveryBackend): ChatRecovery & {
  whenIdle(): Promise<void>
} {
  let inFlight: Promise<unknown> | undefined
  let pending: RecoveryKey | undefined

  const exclusive = async <T>(work: () => Promise<T>): Promise<T> => {
    if (inFlight) throw new Error('RECOVERY_BUSY')
    const operation = Promise.resolve().then(work)
    inFlight = operation
    try {
      return await operation
    } finally {
      inFlight = undefined
    }
  }
  const getPendingRecoveryKey = async () => {
    if (pending) return pending
    try {
      const key = await backend.loadPending()
      return key ? {key, persisted: true} : undefined
    } catch {
      throw new Error('RECOVERY_STORAGE_FAILED')
    }
  }

  return {
    getSecurityStatus: () => exclusive(() => backend.status()),
    getPendingRecoveryKey,
    enableRecovery: () =>
      exclusive(async () => {
        const existing = await getPendingRecoveryKey()
        if (existing) return existing
        const status = await backend.status()
        if (status.recovery !== 'disabled' || status.backupExists) {
          throw new Error('RECOVER_EXISTING_KEYS_FIRST')
        }
        let key: string
        try {
          key = await backend.enable()
        } catch {
          throw new Error('RECOVERY_SETUP_FAILED')
        }
        // A storage failure must never discard the only copy of a newly created key.
        pending = {key, persisted: false}
        try {
          await backend.savePending(key)
          pending = {key, persisted: true}
        } catch {}
        return pending
      }),
    acknowledgeRecoveryKey: () =>
      exclusive(async () => {
        try {
          await backend.clearPending()
          pending = undefined
        } catch {
          throw new Error('RECOVERY_STORAGE_FAILED')
        }
      }),
    recover: key =>
      exclusive(async () => {
        const normalized = key.trim()
        if (!normalized || normalized.length > 512)
          throw new Error('INVALID_RECOVERY_KEY')
        try {
          await backend.recover(normalized)
        } catch {
          throw new Error('RECOVERY_RESTORE_FAILED')
        }
      }),
    syncKeyBackup: () =>
      exclusive(async () => {
        try {
          await backend.sync()
        } catch {
          throw new Error('RECOVERY_SYNC_FAILED')
        }
      }),
    async whenIdle() {
      await inFlight?.catch(() => {})
    },
  }
}
