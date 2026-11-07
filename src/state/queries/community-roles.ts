import {useCallback} from 'react'
import {type NsidString} from '@atproto/syntax'
import {useMutation, useQueryClient} from '@tanstack/react-query'

import {AUTHORITY_EVENT_COLLECTION} from '#/lib/assembly-decision'
import {
  type CommunityRoleHolder,
  type CommunityRoleOffer,
} from '#/lib/community-governance'
import {
  buildModeratorAppointment,
  buildModeratorResignation,
  buildModeratorRevocation,
  buildRoleAcceptance,
  buildRoleOffer,
  ROLE_ACCEPTANCE_COLLECTION,
  ROLE_OFFER_COLLECTION,
} from '#/lib/community-roles'
import {useAgent} from '#/state/session'
import {com} from '#/lexicons'
import {communityGovernanceQueryKey} from './community-governance'

/**
 * The records that move a moderator appointment forward. Each is written to
 * the signed-in account's own repo; the AppView indexes it a moment later and
 * decides whether it counts, so every action refreshes the roster twice.
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

  const create = useCallback(
    async (collection: string, record: object) => {
      if (!viewerDid) throw new Error('Inicia sesión para continuar.')
      return agent.pdsClient.call(com.atproto.repo.createRecord, {
        repo: viewerDid,
        collection: collection as NsidString,
        record,
      })
    },
    [agent, viewerDid],
  )

  const refresh = useCallback(() => {
    const key = communityGovernanceQueryKey(communityName, communityId)
    void queryClient.invalidateQueries({queryKey: key})
    // The AppView indexes a moment after the write.
    setTimeout(() => void queryClient.invalidateQueries({queryKey: key}), 2500)
  }, [communityName, communityId, queryClient])

  const community = () => {
    if (!boardUri) throw new Error('No se pudo identificar la comunidad.')
    return boardUri
  }

  const offer = useMutation({
    mutationFn: async (subject: string) =>
      create(
        ROLE_OFFER_COLLECTION,
        buildRoleOffer({community: community(), subject}),
      ),
    onSuccess: refresh,
  })

  const accept = useMutation({
    mutationFn: async (target: CommunityRoleOffer) => {
      if (!viewerDid) throw new Error('Inicia sesión para continuar.')
      return create(
        ROLE_ACCEPTANCE_COLLECTION,
        buildRoleAcceptance({
          community: community(),
          offer: target,
          subject: viewerDid,
        }),
      )
    },
    onSuccess: refresh,
  })

  const appoint = useMutation({
    mutationFn: async (target: CommunityRoleOffer) => {
      if (!viewerDid) throw new Error('Inicia sesión para continuar.')
      return create(
        AUTHORITY_EVENT_COLLECTION,
        buildModeratorAppointment({
          community: community(),
          issuer: viewerDid,
          offer: target,
        }),
      )
    },
    onSuccess: refresh,
  })

  const resign = useMutation({
    mutationFn: async (holder: CommunityRoleHolder) =>
      create(
        AUTHORITY_EVENT_COLLECTION,
        buildModeratorResignation({community: community(), holder}),
      ),
    onSuccess: refresh,
  })

  const revoke = useMutation({
    mutationFn: async (holder: CommunityRoleHolder) => {
      if (!viewerDid) throw new Error('Inicia sesión para continuar.')
      return create(
        AUTHORITY_EVENT_COLLECTION,
        buildModeratorRevocation({
          community: community(),
          issuer: viewerDid,
          holder,
        }),
      )
    },
    onSuccess: refresh,
  })

  return {viewerDid, offer, accept, appoint, resign, revoke}
}
