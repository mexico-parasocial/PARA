import {type AtIdentifierString} from '@atproto/syntax'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'

import {castPolicyVote} from '#/lib/api/policy-vote'
import {STALE} from '#/state/queries'
import {policyCommunityVotesQueryRoot} from '#/state/queries/policy-community-votes'
import {policyTallyQueryKey} from '#/state/queries/policy-tally'
import {useAgent, useSession} from '#/state/session'
import {com} from '#/lexicons'

const SIGNALS_RQKEY_ROOT = 'policy-signals'

/** Keyed by voter: a signal is the viewer's own and must never cross accounts. */
export const policySignalsQueryKey = (did: string) => [SIGNALS_RQKEY_ROOT, did]

type PolicySignals = Record<string, number>

/**
 * The viewer's own -3..+3 ballot on each policy, by policy URI. Read from
 * their own repo because the AppView never exposes who voted what.
 */
export function useViewerPolicySignalsQuery() {
  const agent = useAgent()
  const {currentAccount} = useSession()
  const did = currentAccount?.did ?? ''

  return useQuery<PolicySignals>({
    staleTime: STALE.SECONDS.THIRTY,
    enabled: Boolean(did),
    queryKey: policySignalsQueryKey(did),
    queryFn: async () => {
      const res = await agent.pdsClient.call(com.atproto.repo.listRecords, {
        repo: did as AtIdentifierString,
        collection: 'com.para.civic.vote',
        limit: 100,
        reverse: true,
      })
      const signals: PolicySignals = {}
      for (const record of res.records) {
        const value = record.value as {
          subject?: unknown
          subjectType?: unknown
          signal?: unknown
        }
        if (
          value.subjectType !== 'policy' ||
          typeof value.subject !== 'string' ||
          typeof value.signal !== 'number'
        ) {
          continue
        }
        // Newest first: keep only the latest ballot per policy.
        if (!(value.subject in signals)) signals[value.subject] = value.signal
      }
      return signals
    },
  })
}

/** Casts a public policy ballot as the identity the person is using. */
export function usePolicyVoteMutation() {
  const agent = useAgent()
  const queryClient = useQueryClient()
  const {currentAccount} = useSession()
  const did = currentAccount?.did ?? ''

  return useMutation({
    mutationFn: (input: {policyUri: string; signal: number}) =>
      castPolicyVote(agent, input),
    onSuccess: (_created, {policyUri, signal}) => {
      queryClient.setQueryData<PolicySignals>(
        policySignalsQueryKey(did),
        previous => ({...previous, [policyUri]: signal}),
      )
      // The AppView indexes the ballot from the firehose, so the tally can
      // trail the write by a moment; refetch rather than guess its new value.
      void queryClient.invalidateQueries({
        queryKey: policyTallyQueryKey(policyUri),
      })
      void queryClient.invalidateQueries({
        queryKey: [policyCommunityVotesQueryRoot, did, policyUri],
      })
    },
  })
}
