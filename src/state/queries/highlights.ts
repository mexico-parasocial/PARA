import {useQuery} from '@tanstack/react-query'

import {fetchHighlightById, fetchHighlights} from '#/lib/services/highlights'
import {STALE} from '#/state/queries'
import {useAgent} from '#/state/session'

const RQKEY_ROOT = 'highlights'

export function useHighlightsQuery() {
  const agent = useAgent()
  return useQuery({
    staleTime: STALE.MINUTES.ONE,
    queryKey: [RQKEY_ROOT, 'list'],
    placeholderData: previous => previous,
    queryFn: async () => {
      const result = await fetchHighlights(agent, {limit: 50})
      return result.data
    },
  })
}

export function useHighlightQuery(highlightId: string | undefined) {
  const agent = useAgent()
  return useQuery({
    staleTime: STALE.SECONDS.THIRTY,
    queryKey: [RQKEY_ROOT, 'detail', highlightId || ''],
    enabled: Boolean(highlightId),
    placeholderData: previous => previous,
    queryFn: async () => {
      if (!highlightId) return null
      return await fetchHighlightById(agent, highlightId)
    },
  })
}
