/*
 * Serialises writes per collection and remembers what was just written.
 *
 * Every collection write is a read-modify-write of the whole record, and the
 * read model lags the write (bsync indexes asynchronously). Two edits fired in
 * quick succession would otherwise both read the same base and the later write
 * would erase the earlier one. Running them one at a time, and basing each on
 * the previous write rather than on a read that may not have caught up, closes
 * that window for a single device. A server-side ops endpoint is what closes it
 * across devices.
 */

const tails = new Map<string, Promise<unknown>>()
const pending = new Map<string, number>()
const recent = new Map<string, {value: unknown; at: number}>()

/** How long a just-written collection is trusted over a fresh read. */
const RECENT_WRITE_TTL_MS = 15_000

export function enqueueCollectionWrite<T>(
  collectionId: string,
  task: () => Promise<T>,
): Promise<T> {
  pending.set(collectionId, (pending.get(collectionId) ?? 0) + 1)
  const previous = tails.get(collectionId) ?? Promise.resolve()
  const run = previous.then(task, task)
  const settle = () => {
    const left = (pending.get(collectionId) ?? 1) - 1
    if (left <= 0) {
      pending.delete(collectionId)
      tails.delete(collectionId)
    } else {
      pending.set(collectionId, left)
    }
  }
  tails.set(collectionId, run)
  run.then(settle, settle)
  return run
}

/** True while a write to this collection is queued or running. */
export function hasPendingCollectionWrite(collectionId: string): boolean {
  return (pending.get(collectionId) ?? 0) > 0
}

export function rememberCollectionWrite<T>(collectionId: string, value: T) {
  recent.set(collectionId, {value, at: Date.now()})
}

export function recallCollectionWrite<T>(collectionId: string): T | undefined {
  const entry = recent.get(collectionId)
  if (!entry) return undefined
  if (Date.now() - entry.at > RECENT_WRITE_TTL_MS) {
    recent.delete(collectionId)
    return undefined
  }
  return entry.value as T
}

export function forgetCollectionWrite(collectionId: string) {
  recent.delete(collectionId)
}
