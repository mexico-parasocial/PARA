import {
  type FollowThroughSummaryView,
  type FollowThroughView,
} from '#/lib/api/follow-through'

const DAY_MS = 24 * 60 * 60 * 1000

export type FollowStatus =
  'planned' | 'in_progress' | 'completed' | 'blocked' | 'abandoned'

const KNOWN_STATUSES: readonly string[] = [
  'planned',
  'in_progress',
  'completed',
  'blocked',
  'abandoned',
]

/** Statuses the AppView may add later are shown as-is, never guessed at. */
export function knownStatus(status: string): FollowStatus | null {
  return KNOWN_STATUSES.includes(status) ? (status as FollowStatus) : null
}

export type StatusTone = 'neutral' | 'active' | 'good' | 'warn' | 'bad'

export function statusTone(status: string, overdue: boolean): StatusTone {
  if (overdue) return 'bad'
  switch (knownStatus(status)) {
    case 'completed':
      return 'good'
    case 'in_progress':
      return 'active'
    case 'blocked':
      return 'warn'
    case 'abandoned':
    case 'planned':
    default:
      return 'neutral'
  }
}

/**
 * Progress to draw, or null. The AppView leaves `progress` out when it cannot
 * be determined from what was written, and the client must not fill it in.
 */
export function shownProgress(progress: number | undefined): number | null {
  if (typeof progress !== 'number' || !Number.isFinite(progress)) return null
  return Math.min(100, Math.max(0, Math.round(progress)))
}

export type DueState =
  | {kind: 'none'}
  | {kind: 'upcoming'; days: number; at: string}
  | {kind: 'overdue'; days: number; at: string}

/**
 * How a due date relates to now. Whether a compromiso is overdue is the
 * AppView's call (`overdue`), because a finished one is never late; this only
 * supplies the distance in whole days.
 */
export function dueState(
  item: Pick<FollowThroughView, 'currentDueAt' | 'dueAt' | 'overdue'>,
  now: number,
): DueState {
  const at = item.currentDueAt ?? item.dueAt
  if (!at) return {kind: 'none'}
  const due = Date.parse(at)
  if (Number.isNaN(due)) return {kind: 'none'}
  const days = Math.floor(Math.abs(due - now) / DAY_MS)
  return item.overdue
    ? {kind: 'overdue', days, at}
    : {kind: 'upcoming', days, at}
}

/**
 * Counts for the header of the section. Only what was written is counted: no
 * percentage is derived here, and none is shown without `summary.progress`.
 */
export function summaryFacts(summary: FollowThroughSummaryView) {
  return {
    total: summary.total,
    completed: summary.completed,
    overdue: summary.overdue,
    abandoned: summary.abandoned,
    progress: shownProgress(summary.progress),
    nextDueAt: summary.nextDueAt ?? null,
    lastUpdateAt: summary.lastUpdateAt ?? null,
  }
}

/** Updates arrive oldest first; the timeline shows the newest on top. */
export function newestFirst<T extends {occurredAt: string}>(
  updates: readonly T[] | undefined,
): T[] {
  return [...(updates ?? [])].sort(
    (a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt),
  )
}
