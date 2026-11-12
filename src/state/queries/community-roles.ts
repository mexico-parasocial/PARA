import {useCallback} from 'react'
import {type DidString} from '@atproto/syntax'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'

import {
  communityAct,
  communityDid,
  isCommunityUri,
} from '#/lib/api/community-act'
import {
  type CommunityRoleHolder,
  type CommunityRoleOffer,
} from '#/lib/community-governance'
import {STALE} from '#/state/queries'
import {createQueryKey} from '#/state/queries/util'
import {useAgent} from '#/state/session'
import {com} from '#/lexicons'
import {communityGovernanceQueryKey} from './community-governance'

const communityOffersQueryKey = (
  communityUri: string | undefined,
  viewerDid: string | undefined,
) => createQueryKey('community-open-offers', {communityUri, viewerDid})

/**
 * Moderator offers still open in a community. The AppView shows an owner or
 * moderator all of them and anyone else only their own, so the list is keyed
 * by viewer.
 */
export function useCommunityOpenOffersQuery(communityUri: string | undefined) {
  const agent = useAgent()
  const viewerDid = agent.session?.did
  return useQuery({
    queryKey: communityOffersQueryKey(communityUri, viewerDid),
    enabled: Boolean(viewerDid) && isCommunityUri(communityUri),
    staleTime: STALE.SECONDS.THIRTY,
    queryFn: async (): Promise<CommunityRoleOffer[]> => {
      const res = await agent.appviewClient.call(
        com.para.community.listOpenOffers,
        {community: communityDid(communityUri), limit: 100},
      )
      return res.offers
        .filter(offer => offer.office === 'moderator')
        .map(offer => ({
          seq: offer.seq,
          role: offer.office,
          subject: offer.subject,
          offeredBy: offer.issuer,
          expiresAt: offer.expiresAt,
        }))
    },
  })
}

/**
 * The steps of a moderator appointment. Each is one community action that the
 * host accepts or refuses on the spot; the AppView indexes it a moment later,
 * so every action refreshes the roster twice.
 */
export function useCommunityRoleActions({
  communityName,
  communityId,
  boardUri,
}: {
  communityName: string
  communityId?: string
  boardUri?: string
}) {
  const agent = useAgent()
  const queryClient = useQueryClient()
  const viewerDid = agent.session?.did

  const refresh = useCallback(() => {
    const keys = [
      communityGovernanceQueryKey(communityName, communityId),
      communityOffersQueryKey(boardUri, viewerDid),
    ]
    const invalidate = () => {
      for (const queryKey of keys) {
        void queryClient.invalidateQueries({queryKey})
      }
    }
    invalidate()
    // The AppView indexes a moment after the write.
    setTimeout(invalidate, 2500)
  }, [communityName, communityId, boardUri, viewerDid, queryClient])

  const offer = useMutation({
    mutationFn: async (subject: string) =>
      communityAct(agent, boardUri, {
        action: 'moderator.offer',
        subject: subject as DidString,
      }),
    onSuccess: refresh,
  })

  const accept = useMutation({
    mutationFn: async (target: CommunityRoleOffer) =>
      communityAct(agent, boardUri, {
        action: 'moderator.accept',
        offer: target.seq,
      }),
    onSuccess: refresh,
  })

  const resign = useMutation({
    mutationFn: async () =>
      communityAct(agent, boardUri, {action: 'moderator.resign'}),
    onSuccess: refresh,
  })

  const revoke = useMutation({
    mutationFn: async (holder: CommunityRoleHolder) =>
      communityAct(agent, boardUri, {
        action: 'moderator.revoke',
        subject: holder.did as DidString,
      }),
    onSuccess: refresh,
  })

  return {viewerDid, offer, accept, resign, revoke}
}
