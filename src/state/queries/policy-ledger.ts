import {type AtIdentifierString, type AtUriString} from '@atproto/syntax'
import {useQuery} from '@tanstack/react-query'

import {isParaPostView} from '#/lib/api/feed/para'
import {PARA_CIVIC_VOTE_COLLECTION} from '#/lib/api/para-lexicons'
import {hydrateCommunityPosts} from '#/lib/community-posts'
import {
  type PolicyBallot,
  selectCurrentPolicyBallots,
} from '#/lib/policy-ledger'
import {STALE} from '#/state/queries'
import {createQueryKey} from '#/state/queries/util'
import {useAgent} from '#/state/session'
import {type app, com} from '#/lexicons'

const BALLOTS_RQKEY_ROOT = 'policy-ballots'
const LEDGER_POSTS_RQKEY_ROOT = 'policy-ledger-posts'

/** Keyed by voter. Invalidate it whenever that voter casts a policy ballot. */
export const policyBallotsQueryKey = (did: string) =>
  createQueryKey(BALLOTS_RQKEY_ROOT, {did})

/** `getPosts` accepts at most this many URIs per call. */
const POSTS_PER_REQUEST = 25
/** A ceiling on repo pages, so a huge history cannot stall the screen. */
const MAX_RECORD_PAGES = 10

export type PolicyBallots = {
  ballots: PolicyBallot[]
  /** True when the history is longer than what was read. */
  truncated: boolean
}

export type PolicyLedgerEntry = PolicyBallot & {
  /** `null` when the policy was deleted or the AppView does not serve it. */
  post: app.bsky.feed.defs.PostView | null
}

export type PolicyLedger = {
  entries: PolicyLedgerEntry[]
  truncated: boolean
}

/**
 * Someone's current policy ballots, newest first. Ballots are public records
 * in the voter's own repo; the AppView only serves tallies, never who voted
 * what, so they are read from the repo. This reads no posts, so counts can use
 * it cheaply; the ledger adds the policies on top.
 */
export function usePolicyBallotsQuery(did: string | undefined) {
  const agent = useAgent()
  return useQuery<PolicyBallots>({
    staleTime: STALE.SECONDS.THIRTY,
    enabled: Boolean(did),
    queryKey: policyBallotsQueryKey(did ?? ''),
    queryFn: async () => {
      const records: {uri: string; value: unknown}[] = []
      let cursor: string | undefined
      let pages = 0
      do {
        const res = await agent.pdsClient.call(com.atproto.repo.listRecords, {
          repo: did as AtIdentifierString,
          collection: PARA_CIVIC_VOTE_COLLECTION,
          limit: 100,
          cursor,
        })
        records.push(...res.records)
        cursor = res.cursor
        pages += 1
      } while (cursor && pages < MAX_RECORD_PAGES)

      return {
        ballots: selectCurrentPolicyBallots(records),
        truncated: Boolean(cursor),
      }
    },
  })
}

/** Someone's current policy ballots with the policies they were cast on. */
export function usePolicyLedgerQuery(did: string | undefined) {
  const agent = useAgent()
  const ballots = usePolicyBallotsQuery(did)
  const uris = ballots.data?.ballots.map(ballot => ballot.policyUri) ?? []
  const posts = useQuery<Record<string, app.bsky.feed.defs.PostView>>({
    staleTime: STALE.SECONDS.THIRTY,
    enabled: Boolean(ballots.data),
    queryKey: createQueryKey(LEDGER_POSTS_RQKEY_ROOT, {uris}),
    queryFn: async () => {
      const found: Record<string, app.bsky.feed.defs.PostView> = {}
      const profileCache = new Map<
        string,
        app.bsky.actor.defs.ProfileViewDetailed
      >()
      for (let i = 0; i < uris.length; i += POSTS_PER_REQUEST) {
        const res = await agent.appviewClient.call(com.para.feed.getPosts, {
          uris: uris.slice(i, i + POSTS_PER_REQUEST) as AtUriString[],
        })
        const hydrated = await hydrateCommunityPosts({
          agent: {appviewClient: agent.appviewClient},
          posts: (res.posts ?? []).filter(isParaPostView),
          profileCache,
        })
        for (const post of hydrated) found[post.uri] = post
      }
      return found
    },
  })

  const data: PolicyLedger | undefined =
    ballots.data && posts.data
      ? {
          entries: ballots.data.ballots.map(ballot => ({
            ...ballot,
            post: posts.data[ballot.policyUri] ?? null,
          })),
          truncated: ballots.data.truncated,
        }
      : undefined

  return {
    data,
    isLoading: ballots.isLoading || (Boolean(ballots.data) && posts.isLoading),
    isError: ballots.isError || posts.isError,
    refetch: () => Promise.all([ballots.refetch(), posts.refetch()]),
  }
}
