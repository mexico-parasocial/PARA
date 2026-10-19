import {useMemo} from 'react'
import {useQueries} from '@tanstack/react-query'

import {STALE} from '#/state/queries'
import {useAgent, useSession} from '#/state/session'
import {
  type MatterAnchor,
  mergeRelatedItems,
  relatedFromCollections,
  relatedFromCommunityGraph,
  type RelatedItem,
} from '#/features/civicTree/matterRelated'
import {collapseCommunityTreeTwins} from '#/features/communityCivicTree/communitySelection'
import {useCollectionsQuery} from './collections'
import {useCommunityTreeDirectoryQuery} from './community-boards'
import {
  fetchCommunityCivicTreeGraph,
  getCommunityCivicTreeGraphQueryKey,
} from './community-civic-tree'

/** Trees read per matter. Each is one request, so the list is bounded. */
const MAX_COMMUNITY_TREES = 12

/**
 * Everything the civic trees connect to a matter: the viewer's own
 * collections plus the trees of communities, with the viewer's communities
 * first. Cards that sit in a tree without a connection to the matter are not
 * related to it.
 */
export function useMatterRelatedItems(anchor: MatterAnchor) {
  const agent = useAgent()
  const {currentAccount} = useSession()
  const hasAnchor = Boolean(anchor.uri) || (anchor.flairs?.length ?? 0) > 0

  const collections = useCollectionsQuery()
  const directory = useCommunityTreeDirectoryQuery()

  const boards = useMemo(() => {
    const all = collapseCommunityTreeTwins(
      directory.data?.pages.flatMap(page => page.boards) ?? [],
    )
    const joined = all.filter(b => b.viewerMembershipState === 'active')
    const others = all.filter(b => b.viewerMembershipState !== 'active')
    return [...joined, ...others].slice(0, MAX_COMMUNITY_TREES)
  }, [directory.data])

  const graphs = useQueries({
    queries: boards.map(board => ({
      queryKey: getCommunityCivicTreeGraphQueryKey(board.uri),
      queryFn: () => fetchCommunityCivicTreeGraph(agent, board.uri),
      staleTime: STALE.MINUTES.ONE,
      enabled: hasAnchor,
    })),
  })

  const graphKey = graphs.map(g => g.dataUpdatedAt).join(',')
  const items = useMemo<RelatedItem[]>(() => {
    if (!hasAnchor) return []
    const personal = collections.data
      ? relatedFromCollections(collections.data, anchor)
      : []
    const community = graphs.flatMap((graph, i) =>
      graph.data
        ? relatedFromCommunityGraph(
            graph.data,
            {name: boards[i].name, uri: boards[i].uri},
            anchor,
          )
        : [],
    )
    return mergeRelatedItems([...personal, ...community])
    // `graphs` is a new array every render; its data timestamps are the key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAnchor, collections.data, boards, graphKey, anchor.uri, anchor.flairs])

  const isLoading =
    hasAnchor &&
    ((Boolean(currentAccount) && collections.isLoading) ||
      directory.isLoading ||
      graphs.some(g => g.isLoading))
  const failed =
    collections.isError &&
    directory.isError &&
    (boards.length === 0 || graphs.every(g => g.isError))

  return {items, isLoading, isError: hasAnchor && failed}
}
