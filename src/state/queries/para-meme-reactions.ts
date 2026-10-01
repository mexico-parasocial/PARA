import {useCallback, useRef} from 'react'
import {TID} from '@atproto/common-web'
import {type AtIdentifierString, AtUri} from '@atproto/syntax'
import {useQuery, useQueryClient} from '@tanstack/react-query'

import {PARA_OPEN_QUESTION_VOTE_COLLECTION} from '#/lib/api/para-lexicons'
import {INFLUENCE_QUERY_KEY} from '#/state/queries/influence'
import {invalidateMemesFeed} from '#/state/queries/para-memes'
import {useAgent, useSession} from '#/state/session'
import {com} from '#/lexicons'

/**
 * Up/down votes on memes are public reactions: `com.para.civic.openQuestionVote`
 * records (-1 / 0 / +1) in the voter's own repo. OD-7 §5h designates that
 * collection as the public reaction whose count decides nothing, and the
 * AppView already folds it into scores and Influence, where a signed reaction
 * overrides a legacy like by the same voter.
 */
export type MemeReaction = {rkey: string; value: -1 | 0 | 1}

const RQKEY_ROOT = 'para-meme-reactions'
// Viewer-dependent, so the cache is partitioned by DID.
const reactionsQueryKey = (did: string | undefined) => [RQKEY_ROOT, did ?? '']

// The AppView indexes the write from the firehose; give it a moment before
// refetching scores so the refetch doesn't read the old value.
const INDEXING_GRACE_MS = 1500

export function useMyMemeReactionsQuery() {
  const agent = useAgent()
  const {currentAccount} = useSession()
  const did = currentAccount?.did

  return useQuery({
    enabled: Boolean(did),
    queryKey: reactionsQueryKey(did),
    staleTime: 60 * 1000,
    queryFn: async () => {
      const bySubject = new Map<string, MemeReaction & {createdAt: string}>()
      let cursor: string | undefined
      do {
        const res = await agent.pdsClient.call(com.atproto.repo.listRecords, {
          repo: did as AtIdentifierString,
          collection: PARA_OPEN_QUESTION_VOTE_COLLECTION,
          limit: 100,
          cursor,
        })
        for (const record of res.records) {
          const value = record.value as {
            subject?: unknown
            value?: unknown
            createdAt?: unknown
          }
          if (typeof value.subject !== 'string') continue
          if (value.value !== -1 && value.value !== 0 && value.value !== 1)
            continue
          const createdAt =
            typeof value.createdAt === 'string' ? value.createdAt : ''
          const existing = bySubject.get(value.subject)
          // Older duplicates can exist in a repo; the newest one wins, as it
          // does in the AppView.
          if (existing && existing.createdAt >= createdAt) continue
          bySubject.set(value.subject, {
            rkey: new AtUri(record.uri).rkey,
            value: value.value,
            createdAt,
          })
        }
        cursor = res.cursor
      } while (cursor)
      return bySubject
    },
  })
}

/**
 * Returns a function that sets the viewer's reaction on a post or meme. Writes to the
 * same subject are serialized so rapid taps land in order, and the existing
 * record is updated in place rather than piling up new ones.
 */
export function useSetMemeReaction() {
  const agent = useAgent()
  const queryClient = useQueryClient()
  const {currentAccount} = useSession()
  const did = currentAccount?.did
  const chains = useRef(new Map<string, Promise<unknown>>())

  return useCallback(
    (subject: string, value: -1 | 0 | 1) => {
      if (!did) return Promise.reject(new Error('Not signed in'))
      const key = reactionsQueryKey(did)

      const run = async () => {
        const current = queryClient.getQueryData<Map<string, MemeReaction>>(key)
        const rkey = current?.get(subject)?.rkey ?? TID.nextStr()
        await agent.pdsClient.call(com.atproto.repo.putRecord, {
          repo: did as AtIdentifierString,
          collection: PARA_OPEN_QUESTION_VOTE_COLLECTION,
          rkey,
          record: {
            $type: PARA_OPEN_QUESTION_VOTE_COLLECTION,
            subject,
            value,
            createdAt: new Date().toISOString(),
          },
        })
        queryClient.setQueryData<Map<string, MemeReaction>>(key, prev => {
          const next = new Map(prev)
          next.set(subject, {rkey, value})
          return next
        })
        setTimeout(() => {
          void invalidateMemesFeed(queryClient)
          // Every vote moves the author's Influence.
          void queryClient.invalidateQueries({queryKey: INFLUENCE_QUERY_KEY})
        }, INDEXING_GRACE_MS)
      }

      const previous = chains.current.get(subject) ?? Promise.resolve()
      const next = previous.catch(() => {}).then(run)
      chains.current.set(subject, next)
      return next
    },
    [agent, did, queryClient],
  )
}
