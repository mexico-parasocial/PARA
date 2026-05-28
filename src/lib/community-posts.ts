import {type AppBskyActorDefs, type AppBskyFeedDefs} from '@atproto/api'

import {hydrateParaPostView, type ParaPostView} from '#/lib/api/feed/para'

export type CommunityPostHydrationAgent = {
  getProfile: (opts: {
    actor: string
  }) => Promise<{data: AppBskyActorDefs.ProfileViewDetailed}>
}

export async function hydrateCommunityPosts({
  agent,
  posts,
  profileCache,
}: {
  agent: CommunityPostHydrationAgent
  posts: ParaPostView[]
  profileCache: Map<string, AppBskyActorDefs.ProfileViewDetailed>
}): Promise<AppBskyFeedDefs.PostView[]> {
  return Promise.all(
    posts.map(async post => {
      const author = await getAuthorProfile({
        agent,
        actor: post.author,
        profileCache,
      })
      return hydrateParaPostView(post, author).post
    }),
  )
}

async function getAuthorProfile({
  agent,
  actor,
  profileCache,
}: {
  agent: CommunityPostHydrationAgent
  actor: string
  profileCache: Map<string, AppBskyActorDefs.ProfileViewDetailed>
}) {
  const cached = profileCache.get(actor)
  if (cached) return cached

  try {
    const res = await agent.getProfile({actor})
    profileCache.set(actor, res.data)
    return res.data
  } catch {
    const fallback: AppBskyActorDefs.ProfileViewDetailed = {
      did: actor,
      handle: actor,
      displayName: actor,
      labels: [],
    }
    profileCache.set(actor, fallback)
    return fallback
  }
}
