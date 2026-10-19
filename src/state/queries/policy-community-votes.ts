import {type AtUriString} from '@atproto/syntax'
import {useQuery} from '@tanstack/react-query'

import {isXrpcError} from '#/lib/xrpc-error'
import {STALE} from '#/state/queries'
import {useAgent, useSession} from '#/state/session'
import {com} from '#/lexicons'

export const policyCommunityVotesQueryRoot = 'policy-community-votes'

export type PolicyCommunityVotes =
  com.para.civic.getPolicyCommunityVotes.$OutputBody

/**
 * How the members of one community voted on a policy. Keyed by viewer: the
 * AppView only answers a member of the community, so one account's answer must
 * never serve another.
 */
export function usePolicyCommunityVotesQuery({
  post,
  community,
}: {
  post: string | undefined
  community: string | undefined
}) {
  const agent = useAgent()
  const {currentAccount} = useSession()
  const did = currentAccount?.did ?? ''

  return useQuery<PolicyCommunityVotes | null>({
    staleTime: STALE.SECONDS.THIRTY,
    enabled: Boolean(did && post && community),
    queryKey: [policyCommunityVotesQueryRoot, did, post ?? '', community ?? ''],
    queryFn: async () => {
      try {
        return await agent.appviewClient.call(
          com.para.civic.getPolicyCommunityVotes,
          {
            post: post as AtUriString,
            community: community as string,
            limit: 50,
          },
        )
      } catch (error) {
        // Not a member of that community: there is nothing to show, which is
        // different from a failed request.
        if (
          isXrpcError(error) &&
          error.error === 'CommunityMembershipRequired'
        ) {
          return null
        }
        throw error
      }
    },
  })
}
