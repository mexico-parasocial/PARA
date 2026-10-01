import {useMemo} from 'react'
import {type AtUriString} from '@atproto/syntax'
import {useQueries} from '@tanstack/react-query'

import {STALE} from '#/state/queries'
import {useCommunityBoardsQuery} from '#/state/queries/community-boards'
import {
  type CommunityCivicTreeGraph,
  type CommunityTreeContribution,
  getCommunityCivicTreeContributionsQueryKey,
  getCommunityCivicTreeGraphQueryKey,
  isCommunityCivicTreeGraphResponse,
} from '#/state/queries/community-civic-tree'
import {useAgent, useSession} from '#/state/session'
import {
  BOOK_SOURCE_TYPE,
  bookFromCard,
  bookFromContribution,
  type BookView,
  mergeBooks,
} from '#/features/civicTree/books'
import {com} from '#/lexicons'

/** Each community costs two requests, so the fan-out is bounded. */
const MAX_COMMUNITIES = 20

/**
 * Books across the communities the viewer belongs to: approved `book` cards
 * from each community's civic tree, plus the viewer's own book contributions
 * still awaiting review. Reuses the civic-tree query keys so the cache is
 * shared with the community screens and invalidated by the same mutations.
 */
export function useCommunityBooksQuery() {
  const agent = useAgent()
  const {currentAccount} = useSession()
  const viewerDid = currentAccount?.did
  const boardsQuery = useCommunityBoardsQuery({limit: 50})

  const boards = useMemo(
    () =>
      (boardsQuery.data?.boards ?? [])
        .filter(board => board.viewerMembershipState === 'active')
        .slice(0, MAX_COMMUNITIES),
    [boardsQuery.data],
  )

  const graphQueries = useQueries({
    queries: boards.map(board => ({
      queryKey: getCommunityCivicTreeGraphQueryKey(board.uri),
      staleTime: STALE.MINUTES.ONE,
      queryFn: async (): Promise<CommunityCivicTreeGraph> => {
        const res = await agent.appviewClient.call(
          com.para.community.getCivicTree,
          {community: board.uri as AtUriString},
        )
        return isCommunityCivicTreeGraphResponse(res)
          ? res
          : {nodes: [], edges: []}
      },
    })),
  })

  const pendingQueries = useQueries({
    queries: boards.map(board => ({
      queryKey: getCommunityCivicTreeContributionsQueryKey(
        board.uri,
        'pending',
        viewerDid,
      ),
      staleTime: STALE.SECONDS.THIRTY,
      enabled: !!viewerDid,
      queryFn: async (): Promise<CommunityTreeContribution[]> => {
        const res = await agent.appviewClient.call(
          com.para.community.civicTree.listContributions,
          {
            community: board.uri,
            status: 'pending',
            viewer: viewerDid,
          } as com.para.community.civicTree.listContributions.$Params,
        )
        return (
          (res as {contributions?: CommunityTreeContribution[]})
            .contributions ?? []
        )
      },
    })),
  })

  const books = useMemo(() => {
    const out: BookView[] = []
    boards.forEach((board, i) => {
      for (const card of graphQueries[i]?.data?.nodes ?? []) {
        if (card.card_type === BOOK_SOURCE_TYPE) {
          out.push(bookFromCard(card, board.name))
        }
      }
      for (const contribution of pendingQueries[i]?.data ?? []) {
        if (
          contribution.source_type === BOOK_SOURCE_TYPE &&
          contribution.author_did === viewerDid
        ) {
          out.push(bookFromContribution(contribution, board.name))
        }
      }
    })
    return mergeBooks(out)
  }, [boards, graphQueries, pendingQueries, viewerDid])

  const isPending =
    boardsQuery.isPending || graphQueries.some(query => query.isPending)
  // Every community failing is an error; a few failing is a partial list.
  const isError =
    boardsQuery.isError ||
    (graphQueries.length > 0 && graphQueries.every(query => query.isError))

  return {
    books,
    isPending,
    isError,
    hasCommunities: boards.length > 0,
    refetch: () => {
      void boardsQuery.refetch()
      graphQueries.forEach(query => void query.refetch())
      pendingQueries.forEach(query => void query.refetch())
    },
  }
}
