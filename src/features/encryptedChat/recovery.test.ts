import {createChatRecovery, type RecoveryBackend} from './recovery'
import {type ChatSecurityStatus} from './types'

const disabled: ChatSecurityStatus = {
  recovery: 'disabled',
  verification: 'unverified',
  backupExists: false,
  backupEnabled: false,
}
function backend(): jest.Mocked<RecoveryBackend> {
  return {
    status: jest.fn().mockResolvedValue(disabled),
    enable: jest.fn().mockResolvedValue('test-recovery-key'),
    recover: jest.fn().mockResolvedValue(undefined),
    sync: jest.fn().mockResolvedValue(undefined),
    loadPending: jest.fn().mockResolvedValue(null),
    savePending: jest.fn().mockResolvedValue(undefined),
    clearPending: jest.fn().mockResolvedValue(undefined),
  }
}

it.each([
  {...disabled, backupExists: true},
  {...disabled, recovery: 'unknown'},
  {...disabled, recovery: 'incomplete'},
  {...disabled, recovery: 'enabled'},
])('refuses to replace existing or uncertain recovery: %j', async status => {
  const api = backend()
  api.status.mockResolvedValue(status as ChatSecurityStatus)
  await expect(createChatRecovery(api).enableRecovery()).rejects.toThrow(
    'RECOVER_EXISTING_KEYS_FIRST',
  )
  expect(api.enable).not.toHaveBeenCalled()
})

it('keeps the generated key pending until the user acknowledges saving it', async () => {
  const api = backend()
  const recovery = createChatRecovery(api)
  await expect(recovery.enableRecovery()).resolves.toEqual({
    key: 'test-recovery-key',
    persisted: true,
  })
  expect(api.savePending).toHaveBeenCalledWith('test-recovery-key')
  await recovery.enableRecovery()
  expect(api.enable).toHaveBeenCalledTimes(1)
  await recovery.acknowledgeRecoveryKey()
  expect(api.clearPending).toHaveBeenCalledTimes(1)
  await expect(recovery.getPendingRecoveryKey()).resolves.toBeUndefined()
})

it('resumes a pending key after the client has reopened without rotating it', async () => {
  const api = backend()
  api.loadPending.mockResolvedValue('existing-key')
  await expect(createChatRecovery(api).enableRecovery()).resolves.toEqual({
    key: 'existing-key',
    persisted: true,
  })
  expect(api.enable).not.toHaveBeenCalled()
})

it('returns the only key even when the keychain cannot save it', async () => {
  const api = backend()
  api.savePending.mockRejectedValue(new Error('disk unavailable'))
  const recovery = createChatRecovery(api)
  await expect(recovery.enableRecovery()).resolves.toEqual({
    key: 'test-recovery-key',
    persisted: false,
  })
  await expect(recovery.getPendingRecoveryKey()).resolves.toEqual({
    key: 'test-recovery-key',
    persisted: false,
  })
})

it('does not generate keys if pending storage cannot be read', async () => {
  const api = backend()
  api.loadPending.mockRejectedValue(new Error('keychain locked'))
  await expect(createChatRecovery(api).enableRecovery()).rejects.toThrow(
    'RECOVERY_STORAGE_FAILED',
  )
  expect(api.enable).not.toHaveBeenCalled()
})

it('waits for the pending key to reach storage before disposal and rejects overlapping mutations', async () => {
  const api = backend()
  let finish!: () => void
  let started!: () => void
  const saving = new Promise<void>(resolve => {
    started = resolve
  })
  api.savePending.mockImplementation(
    () =>
      new Promise(resolve => {
        finish = resolve
        started()
      }),
  )
  const recovery = createChatRecovery(api)
  const creating = recovery.enableRecovery()
  await expect(recovery.recover('another-key')).rejects.toThrow('RECOVERY_BUSY')
  await saving
  let idle = false
  const waiting = recovery.whenIdle().then(() => {
    idle = true
  })
  await Promise.resolve()
  expect(idle).toBe(false)
  finish()
  await creating
  await waiting
  expect(idle).toBe(true)
})

it('does not leak a recovery key through an SDK error or save input keys', async () => {
  const api = backend()
  api.recover.mockRejectedValue(new Error('bad key: sensitive-example'))
  await expect(
    createChatRecovery(api).recover('  sensitive-example  '),
  ).rejects.toThrow('RECOVERY_RESTORE_FAILED')
  expect(api.recover).toHaveBeenCalledWith('sensitive-example')
  expect(api.savePending).not.toHaveBeenCalled()
})

it('rejects blank keys without contacting the SDK', async () => {
  const api = backend()
  await expect(createChatRecovery(api).recover('  ')).rejects.toThrow(
    'INVALID_RECOVERY_KEY',
  )
  expect(api.recover).not.toHaveBeenCalled()
})

it('keeps the pending key when acknowledgement cannot clear secure storage', async () => {
  const api = backend()
  const recovery = createChatRecovery(api)
  await recovery.enableRecovery()
  api.clearPending.mockRejectedValue(new Error('locked'))
  await expect(recovery.acknowledgeRecoveryKey()).rejects.toThrow(
    'RECOVERY_STORAGE_FAILED',
  )
  await expect(recovery.getPendingRecoveryKey()).resolves.toMatchObject({
    key: 'test-recovery-key',
  })
})

it('only confirms backup synchronization after the SDK finishes', async () => {
  const api = backend()
  const recovery = createChatRecovery(api)
  api.sync.mockRejectedValueOnce(new Error('network'))
  await expect(recovery.syncKeyBackup()).rejects.toThrow('RECOVERY_SYNC_FAILED')
  await expect(recovery.syncKeyBackup()).resolves.toBeUndefined()
})
