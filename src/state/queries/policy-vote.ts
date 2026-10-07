import {useMutation} from '@tanstack/react-query'

import {castPolicyVote} from '#/lib/api/policy-vote'
import {useAgent} from '#/state/session'

/** Casts a public policy ballot as the identity the person is using. */
export function usePolicyVoteMutation() {
  const agent = useAgent()
  return useMutation({
    mutationFn: (input: {policyUri: string; signal: number}) =>
      castPolicyVote(agent, input),
  })
}
