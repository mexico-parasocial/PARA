import {useInfiniteQuery, useQueryClient} from '@tanstack/react-query'

import {logger} from '#/logger'
import {
  type CommunityActivityView,
  fetchCommunityActivitiesPage,
} from '#/state/queries/community-activities'
import {
  communityBoardQueryKey,
  type CommunityBoardView,
  fetchCommunityBoard,
} from '#/state/queries/community-boards'
import {useAgent} from '#/state/session'

type ExplorerEntry = {
  board: CommunityBoardView
  activity: CommunityActivityView
}
type ExplorerPage = {
  boards: CommunityBoardView[]
  entries: ExplorerEntry[]
  cursor?: string
}

const PAGE_SIZE = 25
const STALE_MS = 30_000

/**
 * Pages through every community's activities, as served by the AppView (only
 * those published by each community's organizers), with the board each one
 * belongs to.
 */
export function useCommunityActivityExplorerQuery() {
  const agent = useAgent()
  const queryClient = useQueryClient()

  const query = useInfiniteQuery<ExplorerPage, Error>({
    queryKey: ['community-activity-explorer', agent.session?.did],
    initialPageParam: undefined as string | undefined,
    staleTime: STALE_MS,
    queryFn: async ({pageParam}) => {
      const page = await fetchCommunityActivitiesPage({
        agent,
        cursor: pageParam as string | undefined,
        limit: PAGE_SIZE,
      })
      const communityUris = [
        ...new Set(page.activities.map(a => a.record.communityUri)),
      ]
      const boards = await Promise.allSettled(
        communityUris.map(uri =>
          queryClient.fetchQuery({
            queryKey: communityBoardQueryKey({uri}),
            queryFn: () => fetchCommunityBoard({agent, uri}),
            staleTime: STALE_MS,
          }),
        ),
      )
      const boardByUri = new Map<string, CommunityBoardView>()
      boards.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.board) {
          boardByUri.set(communityUris[index], result.value.board)
        } else if (result.status === 'rejected') {
          logger.warn('community-activity-explorer: board unavailable', {
            communityUri: communityUris[index],
            safeMessage: String(result.reason),
          })
        }
      })
      return {
        boards: [...boardByUri.values()],
        entries: page.activities.flatMap(activity => {
          const board = boardByUri.get(activity.record.communityUri)
          return board ? [{board, activity}] : []
        }),
        cursor: page.cursor,
      }
    },
    getNextPageParam: page => page.cursor || undefined,
  })

  return {
    ...query,
    refresh: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['community-activities', 'list'],
      })
      return query.refetch()
    },
  }
}
