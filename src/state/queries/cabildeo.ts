import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'

import {
  type CabildeoDelegationMode,
  type CabildeoDelegationSignal,
  castCabildeoVote,
  delegateCabildeoVote,
  fetchCabildeo,
  fetchCabildeoPositions,
  fetchCabildeos,
  fetchDelegationCandidates,
} from '#/lib/api/cabildeo'
import {
  type CabildeoView,
  mapCabildeoPositionsFromRead,
  mapCabildeoReadViewToView,
  mapCabildeosToView,
} from '#/lib/cabildeo-client'
import {
  MOCK_CABILDEO_POSITIONS_BY_URI,
  MOCK_CABILDEO_VIEWS,
} from '#/lib/mock-data/cabildeos'
import {USE_MOCK_DATA} from '#/lib/services/config'
import {STALE} from '#/state/queries'
import {useAgent} from '#/state/session'

const RQKEY_ROOT = 'cabildeo'

export const cabildeosQueryKey = [RQKEY_ROOT, 'list']
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
      try {
        const records = await fetchCabildeos(agent)
        const views = mapCabildeosToView(records)
        // In dev mode, if the backend returns empty (migrations missing,
        // seed not run, etc.) inject mock data so the screen never shows a
        // blank slate during active development.
        if (USE_MOCK_DATA && views.length === 0) {
          console.warn(
            '[useCabildeosQuery] Backend returned empty — serving mock cabildeos for dev preview.',
          )
          return MOCK_CABILDEO_VIEWS
        }
        return views
      } catch (err: unknown) {
        // In dev mode, serve mocks so UI work can continue even when the
        // backend isn't fully wired. In production, let the error propagate
        // so React Query's isError state is surfaced to the user.
        if (USE_MOCK_DATA) {
          console.warn(
            '[useCabildeosQuery] Fetch failed — serving mock cabildeos for dev preview. Error:',
            err instanceof Error ? err.message : String(err),
          )
          return MOCK_CABILDEO_VIEWS
        }
        throw err
      }
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
      const mock = USE_MOCK_DATA
        ? MOCK_CABILDEO_VIEWS.find(c => c.uri === cabildeoUri)
        : undefined
      try {
        const cabildeo = await fetchCabildeo(agent, cabildeoUri)
        if (cabildeo) {
          return mapCabildeoReadViewToView(cabildeo)
        }
        if (mock) {
          console.warn(
            '[useCabildeoQuery] Backend returned NotFound — serving mock cabildeo for dev preview.',
          )
          return mock
        }
        return null
      } catch (err: unknown) {
        if (mock) {
          console.warn(
            '[useCabildeoQuery] Fetch failed — serving mock cabildeo for dev preview.',
          )
          return mock
        }
        throw err
      }
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
      const mock = USE_MOCK_DATA
        ? MOCK_CABILDEO_POSITIONS_BY_URI[cabildeoUri]
        : undefined
      try {
        const positions = await fetchCabildeoPositions(agent, {cabildeoUri})
        if (positions.length > 0) {
          return mapCabildeoPositionsFromRead(positions)
        }
        return mock ?? []
      } catch (err: unknown) {
        if (mock) {
          console.warn(
            '[useCabildeoPositionsQuery] Fetch failed — serving mock cabildeo positions for dev preview.',
          )
          return mock
        }
        throw err
      }
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
      preferredOption,
      signal,
    }: {
      cabildeoUri?: string
      delegateTo?: string
      mode?: CabildeoDelegationMode
      reason?: string
      scopeFlairs?: string[]
      party?: string
      community?: string
      preferredOption?: number
      signal?: CabildeoDelegationSignal
    }) =>
      delegateCabildeoVote(agent, {
        cabildeo: cabildeoUri,
        delegateTo,
        mode,
        reason,
        scopeFlairs,
        party,
        community,
        preferredOption,
        signal,
      }),
    onSuccess: (_data, variables) => {
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

export function useVoteMutation() {
  const agent = useAgent()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      cabildeoUri,
      selectedOption,
      isDirect,
    }: {
      cabildeoUri: string
      selectedOption: number
      isDirect: boolean
    }) => {
      await castCabildeoVote(agent, {
        cabildeo: cabildeoUri,
        subject: cabildeoUri,
        subjectType: 'cabildeo',
        selectedOption,
        isDirect,
      })
    },
    onMutate: async ({cabildeoUri, selectedOption, isDirect}) => {
      const queryKey = cabildeoDetailQueryKey(cabildeoUri)
      await queryClient.cancelQueries({queryKey})
      const previous = queryClient.getQueryData<CabildeoView>(queryKey)

      if (previous) {
        const nextOptionSummary = previous.optionSummary.map(s =>
          s.optionIndex === selectedOption ? {...s, votes: s.votes + 1} : s,
        )
        const previousOption = previous.userContext?.viewerVoteOption
        if (
          typeof previousOption === 'number' &&
          previousOption !== selectedOption
        ) {
          const previousSummary = nextOptionSummary.find(
            s => s.optionIndex === previousOption,
          )
          if (previousSummary) {
            previousSummary.votes = Math.max(0, previousSummary.votes - 1)
          }
        }
        // Add entry if this option hasn't been voted on yet
        if (!nextOptionSummary.find(s => s.optionIndex === selectedOption)) {
          const optionLabel =
            previous.options[selectedOption]?.label ||
            `Opción ${selectedOption + 1}`
          nextOptionSummary.push({
            optionIndex: selectedOption,
            label: optionLabel,
            votes: 1,
            positions: 0,
          })
        }

        queryClient.setQueryData(queryKey, {
          ...previous,
          userContext: {
            ...previous.userContext,
            viewerVoteOption: selectedOption,
            viewerVoteIsDirect: isDirect,
            viewerVoteCreatedAt: new Date().toISOString(),
          },
          optionSummary: nextOptionSummary,
          voteTotals: {
            ...previous.voteTotals,
            total:
              typeof previousOption === 'number'
                ? previous.voteTotals.total
                : previous.voteTotals.total + 1,
            direct:
              typeof previousOption === 'number' &&
              previous.userContext?.viewerVoteIsDirect
                ? previous.voteTotals.direct
                : previous.voteTotals.direct + (isDirect ? 1 : 0),
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
