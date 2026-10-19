const revisions = new Map<string, number>()
const pending = new Map<string, Promise<void>>()
const listeners = new Map<string, Set<() => void | Promise<void>>>()

export const chatAccountRevision = (did: string): number =>
  revisions.get(did) ?? 0
export const waitForChatLogout = (did: string): Promise<void> =>
  pending.get(did) ?? Promise.resolve()

export function onChatAccountLogout(
  did: string,
  listener: () => void | Promise<void>,
): () => void {
  const entries = listeners.get(did) ?? new Set()
  entries.add(listener)
  listeners.set(did, entries)
  return () => {
    entries.delete(listener)
    if (!entries.size) listeners.delete(did)
  }
}

/** Invalidate async SDK work immediately; serialize local cleanup before another login. */
export function runChatLogout(
  did: string,
  cleanup: () => Promise<void>,
): Promise<void> {
  revisions.set(did, chatAccountRevision(did) + 1)
  const stops = [...(listeners.get(did) ?? [])].map(listener => {
    try {
      return Promise.resolve(listener())
    } catch (error) {
      return Promise.reject(error)
    }
  })
  const work = waitForChatLogout(did)
    .catch(() => {})
    .then(async () => {
      const results = await Promise.allSettled(stops)
      await cleanup()
      if (results.some(result => result.status === 'rejected'))
        throw new Error('CHAT_CLIENT_CLOSE_INCOMPLETE')
    })
  const barrier = work.catch(() => {})
  pending.set(did, barrier)
  void barrier.then(() => {
    if (pending.get(did) === barrier) pending.delete(did)
  })
  return work
}
