/** Mirrors Matrix SDK vector updates without importing its native module. */
export type TimelineChange<T> =
  | {tag: 'Append' | 'Reset'; inner: {values: T[]}}
  | {tag: 'PushFront' | 'PushBack'; inner: {value: T}}
  | {tag: 'Clear' | 'PopFront' | 'PopBack'}
  | {tag: 'Insert' | 'Set'; inner: {index: number; value: T}}
  | {tag: 'Remove'; inner: {index: number}}
  | {tag: 'Truncate'; inner: {length: number}}

export function applyTimelineChanges<T>(
  items: T[],
  changes: TimelineChange<T>[],
): T[] {
  let next = items.slice()
  for (const change of changes) {
    switch (change.tag) {
      case 'Append':
        next.push(...change.inner.values)
        break
      case 'Reset':
        next = change.inner.values.slice()
        break
      case 'Clear':
        next = []
        break
      case 'PushFront':
        next.unshift(change.inner.value)
        break
      case 'PushBack':
        next.push(change.inner.value)
        break
      case 'PopFront':
        next.shift()
        break
      case 'PopBack':
        next.pop()
        break
      case 'Insert':
        next.splice(change.inner.index, 0, change.inner.value)
        break
      case 'Set':
        next[change.inner.index] = change.inner.value
        break
      case 'Remove':
        next.splice(change.inner.index, 1)
        break
      case 'Truncate':
        next = next.slice(0, change.inner.length)
        break
    }
  }
  return next
}
