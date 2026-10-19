import {useRef} from 'react'
import {type AtUriString} from '@atproto/syntax'
import {useQuery} from '@tanstack/react-query'

import {isParaPostView} from '#/lib/api/feed/para'
import {hydrateCommunityPosts} from '#/lib/community-posts'
import {type PolicyTally} from '#/lib/policy-display'
import {STALE} from '#/state/queries'
import {useAgent} from '#/state/session'
import {app, com} from '#/lexicons'

const TALLY_RQKEY_ROOT = 'policy-tally'
const POST_RQKEY_ROOT = 'policy-post'

export const policyTallyQueryKey = (policyUri: string) => [
  TALLY_RQKEY_ROOT,
  policyUri,
]

export const policyPostQueryKey = (policyUri: string) => [
  POST_RQKEY_ROOT,
  policyUri,
]

function isNotFound(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'error' in error &&
    error.error === 'NotFound'
  )
}

/**
 * The weighted consensus of a policy. `null` means the AppView has no tally
 * for it yet, which is different from a failed request.
 */
export function usePolicyTallyQuery(policyUri: string | undefined) {
  const agent = useAgent()
  return useQuery<PolicyTally | null>({
    staleTime: STALE.SECONDS.THIRTY,
    enabled: Boolean(policyUri),
    queryKey: policyTallyQueryKey(policyUri ?? ''),
    queryFn: async () => {
      try {
        const res = await agent.appviewClient.call(
          com.para.civic.getPolicyTally,
          {post: policyUri as AtUriString},
        )
        return res.tally
      } catch (error) {
        if (isNotFound(error)) return null
        throw error
      }
    },
  })
}

/** A single policy post, hydrated like the posts in search results. */
export function usePolicyPostQuery(policyUri: string | undefined) {
  const agent = useAgent()
  const profileCache = useRef(
    new Map<string, app.bsky.actor.defs.ProfileViewDetailed>(),
  )
  return useQuery<app.bsky.feed.defs.PostView | null>({
    staleTime: STALE.SECONDS.THIRTY,
    enabled: Boolean(policyUri),
    queryKey: policyPostQueryKey(policyUri ?? ''),
    queryFn: async () => {
      const res = await agent.appviewClient.call(com.para.feed.getPosts, {
        uris: [policyUri as AtUriString],
      })
      const [post] = (res.posts ?? []).filter(isParaPostView)
      if (!post) return null
      const [hydrated] = await hydrateCommunityPosts({
        agent: {appviewClient: agent.appviewClient},
        posts: [post],
        profileCache: profileCache.current,
      })
      return hydrated ?? null
    },
  })
}
