import {useRef} from 'react'
import {
  type InfiniteData,
  type QueryKey,
  useInfiniteQuery,
} from '@tanstack/react-query'

import {isParaPostView} from '#/lib/api/feed/para'
import {hydrateCommunityPosts} from '#/lib/community-posts'
import {STALE} from '#/state/queries'
import {useAgent} from '#/state/session'
import {app, com} from '#/lexicons'

const RQKEY_ROOT = 'community-posts'

type CommunityPostsPage = {
  cursor?: string
  posts: app.bsky.feed.defs.PostView[]
}

export const communityPostsQueryKey = ({
  community,
  postType,
}: {
  community: string
  postType?: string
}) => [RQKEY_ROOT, community, postType ?? '']

export function useCommunityPostsQuery({
  community,
  postType,
  enabled = true,
}: {
  community: string
  postType?: string
  enabled?: boolean
}) {
  const agent = useAgent()
  const profileCache = useRef(
    new Map<string, app.bsky.actor.defs.ProfileViewDetailed>(),
  )

  return useInfiniteQuery<
    CommunityPostsPage,
    Error,
    InfiniteData<CommunityPostsPage>,
    QueryKey,
    string | undefined
  >({
    staleTime: STALE.SECONDS.THIRTY,
    queryKey: communityPostsQueryKey({community, postType}),
    enabled: enabled && Boolean(community.trim()),
    initialPageParam: undefined,
    getNextPageParam: lastPage => lastPage.cursor,
    queryFn: async ({pageParam}) => {
      const res = await agent.appviewClient.call(com.para.community.listPosts, {
        community,
        postType,
        cursor: pageParam,
        limit: 25,
      })
      const data = res as {cursor?: string; feed?: unknown[]}
      const paraPosts = (data.feed ?? []).filter(isParaPostView)

      const posts = await hydrateCommunityPosts({
        agent: {appviewClient: agent.appviewClient},
        posts: paraPosts,
        profileCache: profileCache.current,
      })

      return {
        cursor: data.cursor,
        posts,
      }
    },
  })
}
