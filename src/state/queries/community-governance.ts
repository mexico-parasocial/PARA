import {useQuery} from '@tanstack/react-query'

import {
  communityGovernanceRkey,
  type CommunityGovernanceView,
  normalizeCommunityGovernance,
} from '#/lib/community-governance'
import {STALE} from '#/state/queries'
import {useAgent} from '#/state/session'
import {com} from '#/lexicons'

const RQKEY_ROOT = 'community-governance'

export const communityGovernanceQueryKey = (
  communityName: string,
  communityId?: string,
) => [RQKEY_ROOT, communityGovernanceRkey(communityName), communityId || '']

export function useCommunityGovernanceQuery({
  communityName,
  communityId,
  enabled = true,
}: {
  communityName: string
  communityId?: string
  enabled?: boolean
}) {
  const agent = useAgent()

  return useQuery<CommunityGovernanceView | null>({
    staleTime: STALE.SECONDS.THIRTY,
    queryKey: communityGovernanceQueryKey(communityName, communityId),
    enabled: enabled && Boolean(communityName.trim()),
    queryFn: async () =>
      fetchGovernanceFromXrpc({
        agent,
        communityName,
        communityId,
      }),
  })
}

export async function fetchGovernanceFromXrpc({
  agent,
  communityName,
  communityId,
}: {
  agent: ReturnType<typeof useAgent>
  communityName: string
  communityId?: string
}) {
  try {
    const res = await agent.appviewClient.call(
      com.para.community.getGovernance,
      {
        community: communityName,
        communityId,
      },
    )
    return normalizeCommunityGovernance(res, communityName, communityId)
  } catch {
    return null
  }
}
