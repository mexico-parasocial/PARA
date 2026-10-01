import {useInfiniteQuery, useQueryClient} from '@tanstack/react-query'

import {
  communityActivitiesQueryKey,
  type CommunityActivityView,
  fetchCommunityActivities,
  getCommunityOrganizerDids,
} from '#/state/queries/community-activities'
import {
  type CommunityBoardView,
  fetchCommunityBoards,
} from '#/state/queries/community-boards'
import {
  communityGovernanceQueryKey,
  fetchGovernanceFromXrpc,
} from '#/state/queries/community-governance'
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

const PAGE_SIZE = 8
const STALE_MS = 30_000

/** Loads a bounded page of public communities and their organizer-owned records. */
export function useCommunityActivityExplorerQuery() {
  const agent = useAgent()
  const queryClient = useQueryClient()

  const query = useInfiniteQuery<ExplorerPage, Error>({
    queryKey: ['community-activity-explorer', agent.session?.did],
    initialPageParam: undefined as string | undefined,
    staleTime: STALE_MS,
    queryFn: async ({pageParam}) => {
      const page = await fetchCommunityBoards({
        agent,
        opts: {
          limit: PAGE_SIZE,
          sort: 'activity',
          cursor: pageParam as string | undefined,
        },
      })
      const perBoard = await Promise.all(
        page.boards.map(async board => {
          const governance = await queryClient.fetchQuery({
            queryKey: communityGovernanceQueryKey(
              board.name,
              board.communityId,
            ),
            queryFn: () =>
              fetchGovernanceFromXrpc({
                agent,
                communityName: board.name,
                communityId: board.communityId,
              }),
            staleTime: STALE_MS,
          })
          const organizerDids = getCommunityOrganizerDids({
            governance: governance ?? undefined,
            creatorDid: board.creatorDid,
          })
          const activities = await queryClient.fetchQuery({
            queryKey: communityActivitiesQueryKey(board.uri, organizerDids),
            queryFn: () =>
              fetchCommunityActivities({
                agent,
                communityUri: board.uri,
                organizerDids,
              }),
            staleTime: STALE_MS,
          })
          return activities.map(activity => ({board, activity}))
        }),
      )
      return {
        boards: page.boards,
        entries: perBoard.flat(),
        cursor: page.cursor,
      }
    },
    getNextPageParam: page => page.cursor || undefined,
  })

  return {
    ...query,
    refresh: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['community-activities', 'list'],
        }),
        queryClient.invalidateQueries({queryKey: ['community-governance']}),
      ])
      return query.refetch()
    },
  }
}
