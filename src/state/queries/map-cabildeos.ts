import {useQuery, useQueryClient} from '@tanstack/react-query'

import {
  type CabildeoServiceAgent,
  fetchCabildeosWithCoverage,
} from '#/lib/api/cabildeo'
import {type CabildeoView, mapCabildeosToView} from '#/lib/cabildeo-client'
import {MOCK_CABILDEO_VIEWS} from '#/lib/mock-data/cabildeos'
import {USE_MOCK_DATA} from '#/lib/services/config'
import {STALE} from '#/state/queries'
import {cabildeosQueryKey} from '#/state/queries/cabildeo'
import {useAgent} from '#/state/session'

export type MapCivicData = {
  items: CabildeoView[]
  source: 'appview' | 'demo'
  hasMore: boolean
  demoReason?: 'empty' | 'unavailable'
}

// Keep the map's provenance-aware cache separate from the legacy array cache.
// The list prefix lets existing create/vote invalidations refresh both.
export const mapCabildeosQueryKey = (did: string | undefined) => [
  ...cabildeosQueryKey,
  'map-v1',
  did ?? 'anonymous',
  USE_MOCK_DATA,
]

export async function fetchMapCivicData(
  agent: CabildeoServiceAgent,
  allowDemo = USE_MOCK_DATA,
): Promise<MapCivicData> {
  let result
  try {
    result = await fetchCabildeosWithCoverage(agent)
  } catch (error) {
    if (!allowDemo) throw error
    return {
      items: MOCK_CABILDEO_VIEWS,
      source: 'demo',
      hasMore: false,
      demoReason: 'unavailable',
    }
  }
  const items = mapCabildeosToView(result.cabildeos)
  if (allowDemo && items.length === 0 && !result.hasMore) {
    return {
      items: MOCK_CABILDEO_VIEWS,
      source: 'demo',
      hasMore: false,
      demoReason: 'empty',
    }
  }
  return {items, source: 'appview', hasMore: result.hasMore}
}

export function useMapCabildeosQuery() {
  const agent = useAgent()
  const queryClient = useQueryClient()
  const queryKey = mapCabildeosQueryKey(agent.session?.did)
  const query = useQuery({
    queryKey,
    // A failed refresh must retain already-loaded real records, rather than
    // silently replacing them with samples in a development build.
    queryFn: () =>
      fetchMapCivicData(
        agent,
        USE_MOCK_DATA &&
          queryClient.getQueryData<MapCivicData>(queryKey)?.source !==
            'appview',
      ),
    staleTime: STALE.MINUTES.ONE,
    retry: 1,
  })
  return {...query, data: query.data?.items, provenance: query.data}
}

export type MapCivicQuery = Pick<
  ReturnType<typeof useMapCabildeosQuery>,
  'data' | 'provenance' | 'isPending' | 'isError' | 'isFetching' | 'refetch'
>
