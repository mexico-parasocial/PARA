import {
  type InfiniteData,
  type QueryKey,
  useInfiniteQuery,
} from '@tanstack/react-query'

import {STALE} from '#/state/queries'
import {useAgent} from '#/state/session'
import {app} from '#/lexicons'

const suggestedFeedsQueryKeyRoot = 'suggestedFeeds'
export const suggestedFeedsQueryKey = [suggestedFeedsQueryKeyRoot]

export function useSuggestedFeedsQuery() {
  const agent = useAgent()
  return useInfiniteQuery<
    app.bsky.feed.getSuggestedFeeds.$OutputBody,
    Error,
    InfiniteData<app.bsky.feed.getSuggestedFeeds.$OutputBody>,
    QueryKey,
    string | undefined
  >({
    staleTime: STALE.HOURS.ONE,
    queryKey: suggestedFeedsQueryKey,
    queryFn: async ({pageParam}) => {
      return agent.appviewClient.call(app.bsky.feed.getSuggestedFeeds, {
        limit: 10,
        cursor: pageParam,
      })
    },
    initialPageParam: undefined,
    getNextPageParam: lastPage => lastPage.cursor,
  })
}
