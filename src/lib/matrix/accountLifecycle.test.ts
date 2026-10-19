import {
  chatAccountRevision,
  onChatAccountLogout,
  runChatLogout,
  waitForChatLogout,
} from './accountLifecycle'

it('invalidates connecting work immediately and waits for SDK closure before cleanup', async () => {
  const did = 'lifecycle-alice'
  let release!: () => void
  const closed = new Promise<void>(resolve => {
    release = resolve
  })
  const stop = jest.fn(() => closed)
  const cleanup = jest.fn(async () => {})
  const remove = onChatAccountLogout(did, stop)
  const before = chatAccountRevision(did)
  const logout = runChatLogout(did, cleanup)
  expect(chatAccountRevision(did)).toBe(before + 1)
  expect(stop).toHaveBeenCalledTimes(1)
  expect(cleanup).not.toHaveBeenCalled()
  release()
  await logout
  expect(cleanup).toHaveBeenCalledTimes(1)
  remove()
})

it('keeps another account usable and releases the barrier after failed remote logout', async () => {
  const other = chatAccountRevision('lifecycle-bob')
  await expect(
    runChatLogout('lifecycle-alice', async () => {
      throw new Error('offline')
    }),
  ).rejects.toThrow('offline')
  await expect(waitForChatLogout('lifecycle-alice')).resolves.toBeUndefined()
  expect(chatAccountRevision('lifecycle-bob')).toBe(other)
})

it('still removes local access if SDK closure fails and reports incomplete logout', async () => {
  const did = 'lifecycle-close-failure'
  const remove = onChatAccountLogout(did, async () => {
    throw new Error('SDK stop failed')
  })
  const cleanup = jest.fn(async () => {})
  await expect(runChatLogout(did, cleanup)).rejects.toThrow(
    'CHAT_CLIENT_CLOSE_INCOMPLETE',
  )
  expect(cleanup).toHaveBeenCalledTimes(1)
  await expect(waitForChatLogout(did)).resolves.toBeUndefined()
  remove()
})
