import {type AtIdentifierString} from '@atproto/syntax'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'

import {
  type CommunityGovernanceApplicant,
  type CommunityGovernanceOfficialRepresentative,
  PARA_COMMUNITY_GOVERNANCE_COLLECTION,
} from '#/lib/api/para-lexicons'
import {
  appendGovernanceHistoryEntry,
  canManageGovernance,
  communityGovernanceRkey,
  type CommunityGovernanceView,
  createCommunityGovernanceRecord,
  normalizeCommunityGovernance,
} from '#/lib/community-governance'
import {STALE} from '#/state/queries'
import {useAgent, useSession} from '#/state/session'
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

export function useCommunityGovernanceMutation({
  communityName,
  communityId,
}: {
  communityName: string
  communityId?: string
}) {
  const agent = useAgent()
  const {currentAccount} = useSession()
  const queryClient = useQueryClient()
  const queryKey = communityGovernanceQueryKey(communityName, communityId)

  return useMutation<
    CommunityGovernanceView,
    Error,
    (current: CommunityGovernanceView) => CommunityGovernanceView
  >({
    mutationFn: async updater => {
      if (!currentAccount?.did) {
        throw new Error('You need to be signed in to edit governance.')
      }

      const current =
        queryClient.getQueryData<CommunityGovernanceView | null>(queryKey) ||
        null

      if (!current) {
        throw new Error(
          'No published governance record was found for this community.',
        )
      }

      if (!canManageGovernance(current, currentAccount.did)) {
        throw new Error(
          'This account is not authorized to publish governance updates.',
        )
      }

      const next = updater({
        ...current,
        updatedAt: new Date().toISOString(),
        source: 'repo',
        repoDid: currentAccount.did,
      })

      await agent.pdsClient.call(com.atproto.repo.putRecord, {
        repo: currentAccount.did as AtIdentifierString,
        collection: PARA_COMMUNITY_GOVERNANCE_COLLECTION,
        rkey: communityGovernanceRkey(communityName),
        record: createCommunityGovernanceRecord(
          next,
        ) as unknown as com.atproto.repo.putRecord.$InputBody['record'],
      })

      return {
        ...next,
        repoDid: currentAccount.did,
        source: 'repo',
      }
    },
    onSuccess: next => {
      queryClient.setQueryData(queryKey, next)
    },
  })
}

export function publishDeputySelection(
  governance: CommunityGovernanceView,
  roleKey: string,
  applicant: CommunityGovernanceApplicant,
  actorDid: string,
  actorHandle?: string,
) {
  return {
    ...governance,
    deputies: governance.deputies.map(role => {
      if (role.key !== roleKey) return role
      return {
        ...role,
        activeHolder: {
          did: applicant.did,
          handle: applicant.handle,
          displayName: applicant.displayName,
          avatar: applicant.avatar,
        },
        activeSince: new Date().toISOString(),
        applicants: role.applicants.map(existing =>
          applicantIdentity(existing) === applicantIdentity(applicant)
            ? {...existing, status: 'approved' as const}
            : existing,
        ),
      }
    }),
    editHistory: appendGovernanceHistoryEntry(governance.editHistory, {
      action: 'appoint_deputies',
      actorDid,
      actorHandle,
      summary: `Appointed ${applicant.displayName || applicant.handle || 'applicant'} to ${roleKey}.`,
    }),
  }
}

export function publishOfficialRepresentative(
  governance: CommunityGovernanceView,
  representative: CommunityGovernanceOfficialRepresentative,
  actorDid: string,
  actorHandle?: string,
) {
  return {
    ...governance,
    officials: [...governance.officials, representative],
    editHistory: appendGovernanceHistoryEntry(governance.editHistory, {
      action: 'set_official_representatives',
      actorDid,
      actorHandle,
      summary: `Added ${representative.displayName || representative.handle || representative.office} as an official representative.`,
    }),
  }
}

export function applyForDeputyRole(
  governance: CommunityGovernanceView,
  roleKey: string,
  applicant: CommunityGovernanceApplicant,
  actorDid: string,
  actorHandle?: string,
) {
  return {
    ...governance,
    deputies: governance.deputies.map(role => {
      if (role.key !== roleKey) return role
      // Avoid duplicate applications
      if (
        role.applicants.some(
          existing =>
            applicantIdentity(existing) === applicantIdentity(applicant),
        )
      ) {
        return role
      }
      return {
        ...role,
        applicants: [...role.applicants, applicant],
      }
    }),
    editHistory: appendGovernanceHistoryEntry(governance.editHistory, {
      action: 'role_application',
      actorDid,
      actorHandle,
      summary: `Submitted an application for ${roleKey}.`,
    }),
  }
}

async function fetchGovernanceFromXrpc({
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

function applicantIdentity(applicant: CommunityGovernanceApplicant) {
  return applicant.did || applicant.handle || applicant.displayName || ''
}
