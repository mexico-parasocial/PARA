import {type AtIdentifierString, type NsidString} from '@atproto/syntax'
import {useQuery} from '@tanstack/react-query'

import {
  PARA_CIVIC_DELEGATION_COLLECTION,
  PARA_OPEN_QUESTION_COLLECTION,
  PARA_RAQ_PROPOSAL_COLLECTION,
} from '#/lib/api/para-lexicons'
import {STALE} from '#/state/queries'
import {usePolicyBallotsQuery} from '#/state/queries/policy-ledger'
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
  // Policy ballots, as the vote ledger lists them: one current ballot per
  // policy, newest wins, so a policy later downvoted does not count as backed.
  const ballots = usePolicyBallotsQuery(did)
  const delegations = useRepoRecords(did, PARA_CIVIC_DELEGATION_COLLECTION)
  const alignment = useUserAlignment(did)
  const proposed = useRepoRecords(did, PARA_RAQ_PROPOSAL_COLLECTION)
  const open = useRepoRecords(did, PARA_OPEN_QUESTION_COLLECTION)

  return {
    votes: {
      count: ballots.data?.ballots.length,
      isLoading: ballots.isLoading,
      isError: ballots.isError,
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
      count: ballots.data?.ballots.filter(ballot => ballot.signal > 0).length,
      isLoading: ballots.isLoading,
      isError: ballots.isError,
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
