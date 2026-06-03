import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'

import {
  type CommunityBriefingPackRecord,
  type CommunityBriefingPackStatus,
  PARA_COMMUNITY_BRIEFING_PACK_COLLECTION,
} from '#/lib/api/para-lexicons'
import {useAgent, useSession} from '#/state/session'

export type PartyLobbyingBriefingPackView = CommunityBriefingPackRecord & {
  uri: string
  cid?: string
}

export type CreatePartyLobbyingBriefingPackInput = Omit<
  CommunityBriefingPackRecord,
  'packType' | 'createdBy' | 'createdAt' | 'updatedAt'
>

export type UpdatePartyLobbyingBriefingPackInput = {
  uri: string
  cid?: string
  pack: Partial<
    Omit<
      CommunityBriefingPackRecord,
      'packType' | 'communityUri' | 'createdBy' | 'createdAt'
    >
  >
}

export function getBriefingPacksQueryKey(input: {
  communityUri?: string
  party?: string
  cabildeoUri?: string
  civicTreeCardId?: string
  status?: CommunityBriefingPackStatus
}) {
  return ['briefing-packs', input] as const
}

export function usePartyLobbyingBriefingPacksQuery(input: {
  communityUri?: string
  party?: string
  cabildeoUri?: string
  civicTreeCardId?: string
  status?: CommunityBriefingPackStatus
}) {
  const agent = useAgent()
  return useQuery<PartyLobbyingBriefingPackView[]>({
    queryKey: getBriefingPacksQueryKey(input),
    queryFn: async () => {
      try {
        const res = await agent.call('com.para.community.listBriefingPacks', {
          community: input.communityUri,
          party: input.party,
          cabildeo: input.cabildeoUri,
          civicTreeCard: input.civicTreeCardId,
          status: input.status,
        })
        return (
          (res.data as {packs?: PartyLobbyingBriefingPackView[]}).packs ?? []
        )
      } catch {
        return []
      }
    },
    enabled: Boolean(
      input.communityUri || input.party || input.cabildeoUri || input.civicTreeCardId,
    ),
    staleTime: 1000 * 60,
    retry: false,
  })
}

export function useCreatePartyLobbyingBriefingPackMutation() {
  const agent = useAgent()
  const {currentAccount} = useSession()
  const queryClient = useQueryClient()

  return useMutation<
    {pack: PartyLobbyingBriefingPackView},
    Error,
    CreatePartyLobbyingBriefingPackInput
  >({
    mutationFn: async input => {
      if (!currentAccount?.did) throw new Error('Not authenticated')

      const now = new Date().toISOString()
      const record: CommunityBriefingPackRecord = {
        ...input,
        packType: 'party_lobbying',
        createdBy: currentAccount.did,
        createdAt: now,
        updatedAt: now,
      }

      try {
        const res = await agent.call(
          'com.para.community.createBriefingPack',
          undefined,
          record,
          {encoding: 'application/json'},
        )
        return res.data as {pack: PartyLobbyingBriefingPackView}
      } catch (err) {
        const created = await agent.com.atproto.repo.createRecord({
          repo: currentAccount.did,
          collection: PARA_COMMUNITY_BRIEFING_PACK_COLLECTION,
          record: record as unknown as Record<string, unknown>,
        })
        return {
          pack: {
            ...record,
            uri: created.data.uri,
            cid: created.data.cid,
          },
        }
      }
    },
    onSuccess: data => {
      void queryClient.invalidateQueries({queryKey: ['briefing-packs']})
      void queryClient.invalidateQueries({
        queryKey: getBriefingPacksQueryKey({
          communityUri: data.pack.communityUri,
        }),
      })
    },
  })
}

export function useUpdatePartyLobbyingBriefingPackMutation() {
  const agent = useAgent()
  const queryClient = useQueryClient()

  return useMutation<
    {pack: PartyLobbyingBriefingPackView},
    Error,
    UpdatePartyLobbyingBriefingPackInput
  >({
    mutationFn: async input => {
      const res = await agent.call(
        'com.para.community.updateBriefingPack',
        undefined,
        {
          uri: input.uri,
          cid: input.cid,
          pack: {
            ...input.pack,
            updatedAt: new Date().toISOString(),
          },
        },
        {encoding: 'application/json'},
      )
      return res.data as {pack: PartyLobbyingBriefingPackView}
    },
    onSuccess: data => {
      void queryClient.invalidateQueries({queryKey: ['briefing-packs']})
      void queryClient.invalidateQueries({
        queryKey: getBriefingPacksQueryKey({
          communityUri: data.pack.communityUri,
        }),
      })
    },
  })
}
