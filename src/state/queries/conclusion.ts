import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'

import {
  type ConclusionOfCabildeo,
  EMPTY_CONCLUSION,
  fetchConclusion,
  publishConclusion,
} from '#/lib/api/conclusion'
import {MOCK_CONCLUSION_BY_CABILDEO} from '#/lib/mock-data/conclusions'
import {USE_MOCK_DATA} from '#/lib/services/config'
import {STALE} from '#/state/queries'
import {createQueryKey} from '#/state/queries/util'
import {useAgent} from '#/state/session'

const RQKEY_ROOT = 'conclusion'

export const conclusionQueryKey = (cabildeoUri: string) =>
  createQueryKey(RQKEY_ROOT, {cabildeoUri})

/** Turn it on only for a forum or persuasion cabildeo that is not a draft. */
export function useConclusionQuery(
  cabildeoUri: string | undefined,
  {enabled = true}: {enabled?: boolean} = {},
) {
  const agent = useAgent()
  return useQuery<ConclusionOfCabildeo>({
    staleTime: STALE.MINUTES.ONE,
    queryKey: conclusionQueryKey(cabildeoUri ?? ''),
    enabled: enabled && Boolean(cabildeoUri),
    queryFn: async () => {
      if (!cabildeoUri) return EMPTY_CONCLUSION
      // Only the demo forum has a mock conclusion. A real URI never does, so
      // a missing AppView still reads as empty in development.
      const mock = USE_MOCK_DATA
        ? MOCK_CONCLUSION_BY_CABILDEO[cabildeoUri]
        : undefined
      if (mock) return mock
      return await fetchConclusion(agent, cabildeoUri)
    },
  })
}

/** How long the indexer usually takes to pick up a new record. */
const INDEX_DELAY_MS = 4000

export function usePublishConclusionMutation() {
  const agent = useAgent()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Parameters<typeof publishConclusion>[1]) =>
      publishConclusion(agent, input),
    onSuccess: (_data, input) => {
      const queryKey = conclusionQueryKey(input.cabildeo)
      // The record is in the author's repo, not yet in the AppView. Look
      // again once it has had time to be indexed; nothing is shown as
      // published before then.
      void queryClient.invalidateQueries({queryKey})
      setTimeout(
        () => void queryClient.invalidateQueries({queryKey}),
        INDEX_DELAY_MS,
      )
    },
  })
}
