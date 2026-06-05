import {useCallback, useMemo, useRef} from 'react'
import {
  type AppBskyActorDefs,
  type AppBskyFeedDefs,
  type AppBskyFeedSearchPosts,
  AtUri,
  moderatePost,
} from '@atproto/api'
import {
  type InfiniteData,
  type QueryClient,
  type QueryKey,
  useInfiniteQuery,
} from '@tanstack/react-query'

import {isParaPostView} from '#/lib/api/feed/para'
import {hydrateCommunityPosts} from '#/lib/community-posts'
import {useModerationOpts} from '#/state/preferences/moderation-opts'
import {useAgent} from '#/state/session'
import {
  didOrHandleUriMatches,
  embedViewRecordToPostView,
  getEmbeddedPost,
} from './util'

const searchPostsQueryKeyRoot = 'search-posts'
const searchPostsQueryKey = ({
  query,
  sort,
  tag,
}: {
  query: string
  sort?: string
  tag?: string[]
}) => [searchPostsQueryKeyRoot, query, sort, tag?.join(',') ?? '']

export function useSearchPostsQuery({
  query,
  sort,
  enabled,
  tag,
}: {
  query: string
  sort?: 'top' | 'latest'
  enabled?: boolean
  tag?: string[]
}) {
  const agent = useAgent()
  const moderationOpts = useModerationOpts()
  const selectArgs = useMemo(
    () => ({
      isSearchingSpecificUser: /from:(\w+)/.test(query),
      moderationOpts,
    }),
    [query, moderationOpts],
  )
  const lastRun = useRef<{
    data: InfiniteData<AppBskyFeedSearchPosts.OutputSchema>
    args: typeof selectArgs
    result: InfiniteData<AppBskyFeedSearchPosts.OutputSchema>
  } | null>(null)

  return useInfiniteQuery<
    AppBskyFeedSearchPosts.OutputSchema,
    Error,
    InfiniteData<AppBskyFeedSearchPosts.OutputSchema>,
    QueryKey,
    string | undefined
  >({
    queryKey: searchPostsQueryKey({query, sort, tag}),
    queryFn: async ({pageParam}) => {
      const res = await agent.app.bsky.feed.searchPosts({
        q: query,
        tag,
        limit: 25,
        cursor: pageParam,
        sort,
      })
      return res.data
    },
    initialPageParam: undefined,
    getNextPageParam: lastPage => lastPage.cursor,
    enabled: enabled ?? !!moderationOpts,
    select: useCallback(
      (data: InfiniteData<AppBskyFeedSearchPosts.OutputSchema>) => {
        const {moderationOpts, isSearchingSpecificUser} = selectArgs

        /*
         * If a user applies the `from:<user>` filter, don't apply any
         * moderation. Note that if we add any more filtering logic below, we
         * may need to adjust this.
         */
        if (isSearchingSpecificUser) {
          return data
        }

        // Keep track of the last run and whether we can reuse
        // some already selected pages from there.
        let reusedPages = []
        if (lastRun.current) {
          const {
            data: lastData,
            args: lastArgs,
            result: lastResult,
          } = lastRun.current
          let canReuse = true
          for (const key in selectArgs) {
            if (Object.prototype.hasOwnProperty.call(selectArgs, key)) {
              const k = key as keyof typeof selectArgs
              if (selectArgs[k] !== lastArgs[k]) {
                // Can't do reuse anything if any input has changed.
                canReuse = false
                break
              }
            }
          }
          if (canReuse) {
            for (let i = 0; i < data.pages.length; i++) {
              if (data.pages[i] && lastData.pages[i] === data.pages[i]) {
                reusedPages.push(lastResult.pages[i])
                continue
              }
              // Stop as soon as pages stop matching up.
              break
            }
          }
        }

        const result = {
          ...data,
          pages: [
            ...reusedPages,
            ...data.pages.slice(reusedPages.length).map(page => {
              return {
                ...page,
                posts: page.posts.filter(post => {
                  const mod = moderatePost(post, moderationOpts!)
                  return !mod.ui('contentList').filter
                }),
              }
            }),
          ],
        }

        lastRun.current = {data, result, args: selectArgs}

        return result
      },
      [selectArgs],
    ),
  })
}

export function* findAllPostsInQueryData(
  queryClient: QueryClient,
  uri: string,
): Generator<AppBskyFeedDefs.PostView, undefined> {
  const queryDatas = queryClient.getQueriesData<
    InfiniteData<AppBskyFeedSearchPosts.OutputSchema>
  >({
    queryKey: [searchPostsQueryKeyRoot],
  })
  const atUri = new AtUri(uri)

  for (const [_queryKey, queryData] of queryDatas) {
    if (!queryData?.pages) {
      continue
    }
    for (const page of queryData?.pages) {
      for (const post of page.posts) {
        if (didOrHandleUriMatches(atUri, post)) {
          yield post
        }

        const quotedPost = getEmbeddedPost(post.embed)
        if (quotedPost && didOrHandleUriMatches(atUri, quotedPost)) {
          yield embedViewRecordToPostView(quotedPost)
        }
      }
    }
  }
}

export function* findAllProfilesInQueryData(
  queryClient: QueryClient,
  did: string,
): Generator<AppBskyActorDefs.ProfileViewBasic, undefined> {
  const queryDatas = queryClient.getQueriesData<
    InfiniteData<AppBskyFeedSearchPosts.OutputSchema>
  >({
    queryKey: [searchPostsQueryKeyRoot],
  })
  for (const [_queryKey, queryData] of queryDatas) {
    if (!queryData?.pages) {
      continue
    }
    for (const page of queryData?.pages) {
      for (const post of page.posts) {
        if (post.author.did === did) {
          yield post.author
        }
        const quotedPost = getEmbeddedPost(post.embed)
        if (quotedPost?.author.did === did) {
          yield quotedPost.author
        }
      }
    }
  }
}

const paraSearchPostsQueryKeyRoot = 'para-search-posts'

export type ParaSearchPostsFilters = {
  tag?: string[]
  communityUris?: string[]
  cabildeoUris?: string[]
  politicalCompassPositions?: string[]
}

type ParaSearchPostsPage = {
  cursor?: string
  posts: AppBskyFeedDefs.PostView[]
}

const paraSearchPostsQueryKey = ({
  query,
  sort,
  tag,
  communityUris,
  cabildeoUris,
  politicalCompassPositions,
}: {
  query: string
  sort?: string
  tag?: string[]
} & ParaSearchPostsFilters) => [
  paraSearchPostsQueryKeyRoot,
  query,
  sort,
  tag?.join(',') ?? '',
  communityUris?.join(',') ?? '',
  cabildeoUris?.join(',') ?? '',
  politicalCompassPositions?.join(',') ?? '',
]

export function hasParaSearchFilters(filters: ParaSearchPostsFilters) {
  return Boolean(
    filters.tag?.length ||
      filters.communityUris?.length ||
      filters.cabildeoUris?.length ||
      filters.politicalCompassPositions?.length,
  )
}

export function useParaSearchPostsQuery({
  query,
  sort,
  enabled,
  tag,
  communityUris,
  cabildeoUris,
  politicalCompassPositions,
}: {
  query: string
  sort?: 'top' | 'latest'
  enabled?: boolean
  tag?: string[]
} & Omit<ParaSearchPostsFilters, 'tag'>) {
  const agent = useAgent()
  const moderationOpts = useModerationOpts()
  const profileCache = useRef(
    new Map<string, AppBskyActorDefs.ProfileViewDetailed>(),
  )

  return useInfiniteQuery<
    ParaSearchPostsPage,
    Error,
    InfiniteData<ParaSearchPostsPage>,
    QueryKey,
    string | undefined
  >({
    queryKey: paraSearchPostsQueryKey({
      query,
      sort,
      tag,
      communityUris,
      cabildeoUris,
      politicalCompassPositions,
    }),
    enabled: (enabled ?? true) && !!moderationOpts,
    initialPageParam: undefined,
    getNextPageParam: lastPage => lastPage.cursor,
    queryFn: async ({pageParam}) => {
      const res = await agent.call('com.para.feed.searchPosts', {
        q: query,
        tag,
        sort,
        limit: 25,
        cursor: pageParam,
        communityUris,
        cabildeoUris,
        politicalCompassPositions,
      })
      const data = res.data as {cursor?: string; posts?: unknown[]}
      const paraPosts = (data.posts ?? []).filter(isParaPostView)

      const posts = await hydrateCommunityPosts({
        agent,
        posts: paraPosts,
        profileCache: profileCache.current,
      })

      // Apply moderation in the same shape as the bsky search query.
      const filtered = posts.filter(post => {
        if (!moderationOpts) return true
        const mod = moderatePost(post, moderationOpts)
        return !mod.ui('contentList').filter
      })

      return {
        cursor: data.cursor,
        posts: filtered,
      }
    },
  })
}
