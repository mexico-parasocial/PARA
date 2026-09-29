import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'

import {
  advanceCabildeoPhase,
  type CabildeoDelegationEntry,
  type CabildeoDelegationMode,
  castCabildeoVote,
  delegateCabildeoVote,
  fetchCabildeo,
  fetchCabildeoPositions,
  fetchCabildeos,
  fetchDelegationCandidates,
  listMyCabildeoDelegations,
  revokeCabildeoDelegation,
} from '#/lib/api/cabildeo'
import {
  type CabildeoView,
  mapCabildeoPositionsFromRead,
  mapCabildeoReadViewToView,
  mapCabildeosToView,
} from '#/lib/cabildeo-client'
import {STALE} from '#/state/queries'
import {useAgent} from '#/state/session'

const RQKEY_ROOT = 'cabildeo'

export const cabildeosQueryKey = [RQKEY_ROOT, 'list']
export const myDelegationsQueryKey = (cabildeoUri?: string) => [
  RQKEY_ROOT,
  'my-delegations',
  cabildeoUri ?? 'all',
]
export const cabildeoDetailQueryKey = (cabildeoUri: string) => [
  RQKEY_ROOT,
  'detail',
  cabildeoUri,
]
export const cabildeoPositionsQueryKey = (cabildeoUri: string) => [
  RQKEY_ROOT,
  'positions',
  cabildeoUri,
]
export const delegationCandidatesQueryKey = ({
  cabildeoUri,
  communityId,
}: {
  cabildeoUri?: string
  communityId?: string
}) => [
  RQKEY_ROOT,
  'delegation-candidates',
  cabildeoUri || '',
  communityId || '',
]

export function useCabildeosQuery() {
  const agent = useAgent()
  return useQuery<CabildeoView[]>({
    staleTime: STALE.MINUTES.ONE,
    queryKey: cabildeosQueryKey,
    placeholderData: previous => previous,
    queryFn: async () => {
      const records = await fetchCabildeos(agent)
      return mapCabildeosToView(records)
    },
  })
}

export function useCabildeoQuery(cabildeoUri: string | undefined) {
  const agent = useAgent()
  return useQuery<CabildeoView | null>({
    staleTime: STALE.SECONDS.THIRTY,
    queryKey: cabildeoDetailQueryKey(cabildeoUri || ''),
    enabled: Boolean(cabildeoUri),
    placeholderData: previous => previous,
    queryFn: async () => {
      if (!cabildeoUri) return null
      const cabildeo = await fetchCabildeo(agent, cabildeoUri)
      return cabildeo ? mapCabildeoReadViewToView(cabildeo) : null
    },
  })
}

export function useCabildeoPositionsQuery(cabildeoUri: string | undefined) {
  const agent = useAgent()
  return useQuery({
    staleTime: STALE.SECONDS.THIRTY,
    queryKey: cabildeoPositionsQueryKey(cabildeoUri || ''),
    enabled: Boolean(cabildeoUri),
    placeholderData: previous => previous,
    queryFn: async () => {
      if (!cabildeoUri) return []
      const positions = await fetchCabildeoPositions(agent, {cabildeoUri})
      return mapCabildeoPositionsFromRead(positions)
    },
  })
}

export function useDelegationCandidatesQuery({
  cabildeoUri,
  communityId,
}: {
  cabildeoUri?: string
  communityId?: string
}) {
  const agent = useAgent()
  return useQuery({
    staleTime: STALE.SECONDS.THIRTY,
    enabled: Boolean(cabildeoUri),
    queryKey: delegationCandidatesQueryKey({cabildeoUri, communityId}),
    queryFn: async () => {
      if (!cabildeoUri) return []
      const result = await fetchDelegationCandidates(agent, {
        cabildeoUri,
        communityId,
        limit: 50,
      })
      return result.candidates
    },
  })
}

export function useDelegateCabildeoVoteMutation() {
  const agent = useAgent()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      cabildeoUri,
      delegateTo,
      reason,
      scopeFlairs,
      mode = 'active',
      party,
      community,
    }: {
      cabildeoUri?: string
      delegateTo?: string
      mode?: CabildeoDelegationMode
      reason?: string
      scopeFlairs?: string[]
      party?: string
      community?: string
    }) =>
      delegateCabildeoVote(agent, {
        cabildeo: cabildeoUri,
        delegateTo,
        mode,
        reason,
        scopeFlairs,
        party,
        community,
      }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: myDelegationsQueryKey(variables.cabildeoUri),
      })
      if (variables.cabildeoUri) {
        void queryClient.invalidateQueries({
          queryKey: myDelegationsQueryKey(),
        })
      }
      if (variables.cabildeoUri) {
        void queryClient.invalidateQueries({
          queryKey: cabildeoDetailQueryKey(variables.cabildeoUri),
        })
        void queryClient.invalidateQueries({
          queryKey: [
            RQKEY_ROOT,
            'delegation-candidates',
            variables.cabildeoUri,
          ],
        })
      }
      void queryClient.invalidateQueries({queryKey: cabildeosQueryKey})
      if (variables.cabildeoUri) {
        queryClient.setQueryData<CabildeoView | null>(
          cabildeoDetailQueryKey(variables.cabildeoUri),
          previous =>
            previous && variables.delegateTo
              ? {
                  ...previous,
                  userContext: {
                    ...previous.userContext,
                    hasDelegatedTo: variables.delegateTo,
                  },
                }
              : previous,
        )
      }
    },
  })
}

export function useAdvanceCabildeoPhaseMutation(cabildeoUri?: string) {
  const agent = useAgent()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (uri: string) => advanceCabildeoPhase(agent, uri),
    onSuccess: nextPhase => {
      if (cabildeoUri) {
        // Optimistic phase so the timeline moves instantly; the invalidate
        // then catches the AppView's re-indexed row.
        queryClient.setQueryData<CabildeoView | null>(
          cabildeoDetailQueryKey(cabildeoUri),
          previous => (previous ? {...previous, phase: nextPhase} : previous),
        )
        void queryClient.invalidateQueries({
          queryKey: cabildeoDetailQueryKey(cabildeoUri),
        })
      }
      void queryClient.invalidateQueries({queryKey: cabildeosQueryKey})
    },
  })
}

export function useVoteMutation() {
  const agent = useAgent()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      cabildeoUri,
      selectedOption,
    }: {
      cabildeoUri: string
      selectedOption: number
    }) => {
      await castCabildeoVote(agent, {
        cabildeo: cabildeoUri,
        selectedOption,
      })
    },
    onMutate: async ({cabildeoUri, selectedOption}) => {
      const queryKey = cabildeoDetailQueryKey(cabildeoUri)
      await queryClient.cancelQueries({queryKey})
      const previous = queryClient.getQueryData<CabildeoView>(queryKey)

      if (previous) {
        queryClient.setQueryData(queryKey, {
          ...previous,
          userContext: {
            ...previous.userContext,
            viewerVoteOption: selectedOption,
            viewerVoteIsDirect: true,
            viewerVoteCreatedAt: new Date().toISOString(),
          },
        })
      }

      return {previous}
    },
    onError: (_err, {cabildeoUri}, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          cabildeoDetailQueryKey(cabildeoUri),
          context.previous,
        )
      }
    },
    onSettled: (_data, _err, {cabildeoUri}) => {
      // Revalidate detail, positions list, and master list
      void queryClient.invalidateQueries({
        queryKey: cabildeoDetailQueryKey(cabildeoUri),
      })
      void queryClient.invalidateQueries({
        queryKey: cabildeoPositionsQueryKey(cabildeoUri),
      })
      void queryClient.invalidateQueries({queryKey: cabildeosQueryKey})
    },
  })
}

export function useMyCabildeoDelegationsQuery(cabildeoUri?: string) {
  const agent = useAgent()
  return useQuery<CabildeoDelegationEntry[]>({
    staleTime: STALE.SECONDS.THIRTY,
    queryKey: myDelegationsQueryKey(cabildeoUri),
    enabled: Boolean(agent.session),
    queryFn: () => listMyCabildeoDelegations(agent, {cabildeo: cabildeoUri}),
  })
}

export function useRevokeCabildeoDelegationMutation(cabildeoUri?: string) {
  const agent = useAgent()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({uri}: {uri: string}) => revokeCabildeoDelegation(agent, uri),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: myDelegationsQueryKey(cabildeoUri),
      })
      void queryClient.invalidateQueries({queryKey: cabildeosQueryKey})
      if (cabildeoUri) {
        void queryClient.invalidateQueries({
          queryKey: cabildeoDetailQueryKey(cabildeoUri),
        })
        void queryClient.invalidateQueries({
          queryKey: [RQKEY_ROOT, 'delegation-candidates', cabildeoUri],
        })
      }
    },
  })
}
