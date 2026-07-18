import {useRef} from 'react'
import {
  type AppBskyActorDefs,
  type AppBskyFeedDefs,
  moderatePost,
} from '@atproto/api'
import {
  type InfiniteData,
  type QueryKey,
  useInfiniteQuery,
} from '@tanstack/react-query'

import {isParaPostView} from '#/lib/api/feed/para'
import {hydrateCommunityPosts} from '#/lib/community-posts'
import {useModerationOpts} from '#/state/preferences/moderation-opts'
import {useAgent} from '#/state/session'

const paraSearchPostsQueryKeyRoot = 'para-search-posts'

export type ParaSearchPostsFilters = {
  tag?: string[]
  communityUris?: string[]
  cabildeoUris?: string[]
  politicalCompassPositions?: string[]
  postType?: string
  flairs?: string[]
  party?: string
  verifiedPublicFigure?: boolean
  state?: string
  districtKey?: string
  cabildeoPhase?: string
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
  postType,
  flairs,
  party,
  verifiedPublicFigure,
  state,
  districtKey,
  cabildeoPhase,
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
  postType ?? '',
  flairs?.join(',') ?? '',
  party ?? '',
  verifiedPublicFigure != null ? String(verifiedPublicFigure) : '',
  state ?? '',
  districtKey ?? '',
  cabildeoPhase ?? '',
]

export function hasParaSearchFilters(filters: ParaSearchPostsFilters) {
  return Boolean(
    filters.tag?.length ||
      filters.communityUris?.length ||
      filters.cabildeoUris?.length ||
      filters.politicalCompassPositions?.length ||
      filters.postType ||
      filters.flairs?.length ||
      filters.party ||
      filters.verifiedPublicFigure != null ||
      filters.state ||
      filters.districtKey ||
      filters.cabildeoPhase,
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
  postType,
  flairs,
  party,
  verifiedPublicFigure,
  state,
  districtKey,
  cabildeoPhase,
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
      postType,
      flairs,
      party,
      verifiedPublicFigure,
      state,
      districtKey,
      cabildeoPhase,
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
        postType,
        flairs,
        party,
        verifiedPublicFigure,
        state,
        districtKey,
        cabildeoPhase,
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
