import {useQuery} from '@tanstack/react-query'

import {
  EMPTY_FOLLOW_THROUGH,
  fetchFollowThrough,
  fetchFollowThroughItem,
  type FollowThroughOfCabildeo,
  type FollowThroughView,
} from '#/lib/api/follow-through'
import {MOCK_FOLLOW_THROUGH_BY_CABILDEO} from '#/lib/mock-data/follow-through'
import {USE_MOCK_DATA} from '#/lib/services/config'
import {STALE} from '#/state/queries'
import {createQueryKey} from '#/state/queries/util'
import {useAgent} from '#/state/session'

const RQKEY_ROOT = 'follow-through'

export const followThroughQueryKey = (cabildeoUri: string) =>
  createQueryKey(RQKEY_ROOT, {cabildeoUri})

export const followThroughItemQueryKey = (uri: string) =>
  createQueryKey(RQKEY_ROOT, {uri})

/**
 * Seguimiento of one resolved cabildeo. Turn it on only for a resolved one:
 * every other phase has nothing to follow, so asking is wasted work.
 */
export function useFollowThroughQuery(
  cabildeoUri: string | undefined,
  {enabled = true}: {enabled?: boolean} = {},
) {
  const agent = useAgent()
  return useQuery<FollowThroughOfCabildeo>({
    staleTime: STALE.MINUTES.ONE,
    queryKey: followThroughQueryKey(cabildeoUri ?? ''),
    enabled: enabled && Boolean(cabildeoUri),
    queryFn: async () => {
      if (!cabildeoUri) return EMPTY_FOLLOW_THROUGH
      // Only the demo cabildeos have mock seguimiento. A real URI never
      // does, so a missing AppView still reads as empty in development.
      const mock = USE_MOCK_DATA
        ? MOCK_FOLLOW_THROUGH_BY_CABILDEO[cabildeoUri]
        : undefined
      if (mock) return mock
      return await fetchFollowThrough(agent, cabildeoUri)
    },
  })
}

/** One compromiso with its timeline. Fetched when its row is opened. */
export function useFollowThroughItemQuery(
  uri: string | undefined,
  {enabled = true}: {enabled?: boolean} = {},
) {
  const agent = useAgent()
  return useQuery<FollowThroughView | null>({
    staleTime: STALE.SECONDS.THIRTY,
    queryKey: followThroughItemQueryKey(uri ?? ''),
    enabled: enabled && Boolean(uri),
    queryFn: async () => {
      if (!uri) return null
      if (USE_MOCK_DATA) {
        const mock = findMockItem(uri)
        if (mock) return mock
      }
      return await fetchFollowThroughItem(agent, uri)
    },
  })
}

function findMockItem(uri: string): FollowThroughView | undefined {
  for (const group of Object.values(MOCK_FOLLOW_THROUGH_BY_CABILDEO)) {
    for (const item of group.items) {
      if (item.uri === uri) return item
      const child = item.children?.find(c => c.uri === uri)
      if (child) return child
    }
  }
  return undefined
}
