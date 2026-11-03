import {type AtIdentifierString, type NsidString} from '@atproto/syntax'
import {useQuery} from '@tanstack/react-query'

import {
  PARA_CIVIC_DELEGATION_COLLECTION,
  PARA_CIVIC_VOTE_COLLECTION,
  PARA_OPEN_QUESTION_COLLECTION,
  PARA_RAQ_PROPOSAL_COLLECTION,
} from '#/lib/api/para-lexicons'
import {STALE} from '#/state/queries'
import {useProfileVotesQuery} from '#/state/queries/profile-votes'
import {useUserAlignment} from '#/state/queries/raq'
import {useAgent} from '#/state/session'
import {normalizeRaqResults} from '#/screens/RAQ/raq-utils'
import {com} from '#/lexicons'

type RepoRecord = Record<string, unknown>

/** Newest-first records of one collection in a public repo. */
function useRepoRecords(did: string | undefined, collection: NsidString) {
  const agent = useAgent()
  return useQuery<RepoRecord[]>({
    staleTime: STALE.SECONDS.THIRTY,
    enabled: Boolean(did),
    queryKey: ['passport-repo-records', did ?? '', collection],
    queryFn: async () => {
      const res = await agent.pdsClient.call(com.atproto.repo.listRecords, {
        repo: did! as AtIdentifierString,
        collection,
        limit: 100,
        reverse: true,
      })
      return res.records.map(record => record.value as RepoRecord)
    },
  })
}

function texts(records: RepoRecord[] | undefined) {
  return (records ?? []).flatMap(record =>
    typeof record.text === 'string' && record.text.trim()
      ? [record.text.trim()]
      : [],
  )
}

export type PassportData = {
  votes: {count?: number; isLoading: boolean; isError: boolean}
  delegations: {
    count?: number
    activeCount?: number
    isLoading: boolean
    isError: boolean
  }
  policies: {count?: number; isLoading: boolean; isError: boolean}
  raq: {axes: string[]; isLoading: boolean; isError: boolean}
  questions: {texts: string[]; isLoading: boolean; isError: boolean}
}

/**
 * What each section of an account's passport contains. Everything comes from
 * public records, so the same hook serves the owner's preview and a visitor.
 * Activities are absent: no attendance or participation record exists yet.
 */
export function usePassportData(did: string | undefined): PassportData {
  const votes = useProfileVotesQuery(did ?? '')
  const civic = useRepoRecords(did, PARA_CIVIC_VOTE_COLLECTION)
  const delegations = useRepoRecords(did, PARA_CIVIC_DELEGATION_COLLECTION)
  const alignment = useUserAlignment(did)
  const proposed = useRepoRecords(did, PARA_RAQ_PROPOSAL_COLLECTION)
  const open = useRepoRecords(did, PARA_OPEN_QUESTION_COLLECTION)

  return {
    votes: {
      count: votes.data?.length,
      isLoading: votes.isLoading,
      isError: votes.isError,
    },
    delegations: {
      count: delegations.data?.length,
      activeCount: delegations.data?.filter(
        record => (record.mode ?? 'active') === 'active',
      ).length,
      isLoading: delegations.isLoading,
      isError: delegations.isError,
    },
    policies: {
      // Newest ballot wins, so a policy later downvoted must not count.
      count: civic.data ? latestSupportedPolicies(civic.data) : undefined,
      isLoading: civic.isLoading,
      isError: civic.isError,
    },
    raq: {
      axes: normalizeRaqResults(alignment.data?.results).map(r =>
        r.label ? `${r.title}: ${r.label}` : r.title,
      ),
      isLoading: alignment.isLoading,
      isError: alignment.isError,
    },
    questions: {
      texts: [...texts(proposed.data), ...texts(open.data)],
      isLoading: proposed.isLoading || open.isLoading,
      isError: proposed.isError || open.isError,
    },
  }
}

/** Records arrive newest first; only each policy's latest ballot counts. */
function latestSupportedPolicies(records: RepoRecord[]) {
  const latest = new Map<string, number>()
  for (const record of records) {
    if (
      record.subjectType !== 'policy' ||
      typeof record.subject !== 'string' ||
      typeof record.signal !== 'number' ||
      latest.has(record.subject)
    ) {
      continue
    }
    latest.set(record.subject, record.signal)
  }
  return [...latest.values()].filter(signal => signal > 0).length
}
