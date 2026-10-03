import {type CommunityActivityView} from '#/state/queries/community-activities'
import {type CommunityBoardView} from '#/state/queries/community-boards'

export type ActivityCategoryFilter = 'all' | 'social' | 'economic'
export type ActivityTimeFilter = 'upcoming' | 'past' | 'all'
export type ExplorerEntry = {
  board: CommunityBoardView
  activity: CommunityActivityView
}

export function normalizeActivitySearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .trim()
}

export function activityPeriod(activity: CommunityActivityView, now: number) {
  const {record} = activity
  if (record.status === 'cancelled' || record.status === 'completed')
    return 'past'
  if (record.status === 'active') return 'upcoming'
  const end = Date.parse(record.endsAt ?? record.startsAt)
  if (!Number.isFinite(end)) return 'undated'
  return end >= now ? 'upcoming' : 'past'
}

export function filterActivityEntries(
  entries: ExplorerEntry[],
  {
    category,
    communityUri,
    search,
    time,
    now,
  }: {
    category: ActivityCategoryFilter
    communityUri: string | null
    search: string
    time: ActivityTimeFilter
    now: number
  },
) {
  const terms = normalizeActivitySearch(search).split(/\s+/).filter(Boolean)
  return entries
    .filter(({board, activity}) => {
      if (category !== 'all' && activity.category !== category) return false
      if (communityUri && board.uri !== communityUri) return false
      if (time !== 'all' && activityPeriod(activity, now) !== time) return false
      const text = normalizeActivitySearch(
        [
          activity.record.title,
          activity.record.description,
          activity.record.location,
          board.name,
        ]
          .filter(Boolean)
          .join(' '),
      )
      return terms.every(term => text.includes(term))
    })
    .sort((left, right) => {
      if (time === 'all') {
        const order = {upcoming: 0, past: 1, undated: 2}
        const leftPeriod = activityPeriod(left.activity, now)
        const rightPeriod = activityPeriod(right.activity, now)
        if (leftPeriod !== rightPeriod)
          return order[leftPeriod] - order[rightPeriod]
      }
      const a = Date.parse(left.activity.record.startsAt)
      const b = Date.parse(right.activity.record.startsAt)
      if (!Number.isFinite(a)) return Number.isFinite(b) ? 1 : 0
      if (!Number.isFinite(b)) return -1
      return time === 'past' ||
        (time === 'all' && activityPeriod(left.activity, now) === 'past')
        ? b - a
        : a - b
    })
}
