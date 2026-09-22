import {type Client} from '@atproto/lex'
import {
  type AtIdentifierString,
  type DidString,
  type HandleString,
} from '@atproto/syntax'

import {hydrateParaPostView, type ParaPostView} from '#/lib/api/feed/para'
import {app} from '#/lexicons'

export type CommunityPostHydrationAgent = {
  appviewClient: Client
}

export async function hydrateCommunityPosts({
  agent,
  posts,
  profileCache,
}: {
  agent: CommunityPostHydrationAgent
  posts: ParaPostView[]
  profileCache: Map<string, app.bsky.actor.defs.ProfileViewDetailed>
}): Promise<app.bsky.feed.defs.PostView[]> {
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
  profileCache: Map<string, app.bsky.actor.defs.ProfileViewDetailed>
}) {
  const cached = profileCache.get(actor)
  if (cached) return cached

  try {
    const profile = await agent.appviewClient.call(app.bsky.actor.getProfile, {
      actor: actor as AtIdentifierString,
    })
    profileCache.set(actor, profile)
    return profile
  } catch {
    const fallback: app.bsky.actor.defs.ProfileViewDetailed = {
      did: actor as DidString,
      handle: actor as HandleString,
      displayName: actor,
      labels: [],
    }
    profileCache.set(actor, fallback)
    return fallback
  }
}
