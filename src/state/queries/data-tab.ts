import {useInfiniteQuery} from '@tanstack/react-query'

import {type PolicyItem, type RepresentativeItem} from '#/lib/mock-data'
import {fetchPolicies} from '#/lib/services/policies'
import {fetchRepresentatives} from '#/lib/services/representatives'
import {useAgent} from '#/state/session'

export type {RepresentativeItem} // Re-export for compatibility if needed

const STALE_TIME = 60 * 1000 // 1 minute

// Shared filter params for all policy/matter hooks
interface PolicyQueryParams {
  category?: string
  verified?: boolean
  query?: string
  type?: 'Policy' | 'Matter'
  filters?: string[] // selected community/party filter names
}

// Shared filtering logic
function applyFilters(data: PolicyItem[], params: PolicyQueryParams) {
  let filtered = data

  if (params.category && params.category !== 'All') {
    filtered = filtered.filter(p => p.category === params.category)
  }
  if (params.verified) {
    filtered = filtered.filter(p => p.verified)
  }
  if (params.query) {
    const q = params.query.toLowerCase()
    filtered = filtered.filter(p => p.title.toLowerCase().includes(q))
  }
  if (params.filters && params.filters.length > 0) {
    filtered = filtered.filter(
      p =>
        (p.party ? params.filters!.includes(p.party) : false) ||
        (p.community ? params.filters!.includes(p.community) : false),
    )
  }

  return filtered
}

// V2: Specialized Feed Hooks
export function useStatePoliciesQuery(
  params: PolicyQueryParams & {state?: string},
) {
  const agent = useAgent()
  return useInfiniteQuery({
    queryKey: [
      'policies_feed',
      'state',
      params.state,
      params.category,
      params.verified,
      params.query,
      params.type,
      params.filters,
    ],
    queryFn: async ({pageParam}) => {
      const response = await fetchPolicies(agent, {
        feed: 'state',
        cursor: pageParam,
        type: params.type,
      })

      let filtered = response.data
      if (params.state && params.state !== 'None') {
        filtered = filtered.filter(p => p.state === params.state)
      }
      filtered = applyFilters(filtered, params)

      return {cursor: response.cursor, items: filtered}
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: lastPage => lastPage.cursor,
    staleTime: STALE_TIME,
  })
}

export function useFeaturedPoliciesQuery(params: PolicyQueryParams) {
  const agent = useAgent()
  return useInfiniteQuery({
    queryKey: [
      'policies_feed',
      'featured',
      params.category,
      params.verified,
      params.query,
      params.type,
      params.filters,
    ],
    queryFn: async ({pageParam}) => {
      const response = await fetchPolicies(agent, {
        feed: 'featured',
        cursor: pageParam,
        type: params.type,
      })

      const filtered = applyFilters(response.data, params)
      return {cursor: response.cursor, items: filtered}
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: lastPage => lastPage.cursor,
    staleTime: STALE_TIME,
  })
}

export function useCommunityPoliciesQuery(params: PolicyQueryParams) {
  const agent = useAgent()
  return useInfiniteQuery({
    queryKey: [
      'policies_feed',
      'community',
      params.category,
      params.verified,
      params.query,
      params.type,
      params.filters,
    ],
    queryFn: async ({pageParam}) => {
      const response = await fetchPolicies(agent, {
        feed: 'community',
        cursor: pageParam,
        type: params.type,
      })

      const filtered = applyFilters(response.data, params)
      return {cursor: response.cursor, items: filtered}
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: lastPage => lastPage.cursor,
    staleTime: STALE_TIME,
  })
}

export function usePartyPoliciesQuery(params: PolicyQueryParams) {
  const agent = useAgent()
  return useInfiniteQuery({
    queryKey: [
      'policies_feed',
      'party',
      params.category,
      params.verified,
      params.query,
      params.type,
      params.filters,
    ],
    queryFn: async ({pageParam}) => {
      const response = await fetchPolicies(agent, {
        feed: 'party',
        cursor: pageParam,
        type: params.type,
      })

      const filtered = applyFilters(response.data, params)
      return {cursor: response.cursor, items: filtered}
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: lastPage => lastPage.cursor,
    staleTime: STALE_TIME,
  })
}

export function useRecommendedPoliciesQuery(params: PolicyQueryParams) {
  const agent = useAgent()
  return useInfiniteQuery({
    queryKey: [
      'policies_feed',
      'recommended',
      params.category,
      params.query,
      params.type,
      params.filters,
    ],
    queryFn: async ({pageParam}) => {
      const response = await fetchPolicies(agent, {
        feed: 'recommended',
        cursor: pageParam,
        type: params.type,
      })

      const filtered = applyFilters(response.data, params)
      return {cursor: response.cursor, items: filtered}
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: lastPage => lastPage.cursor,
    staleTime: STALE_TIME,
  })
}

// Keep legacy/generic hooks for search or other views if needed
export function usePoliciesQuery(params: {category?: string; query?: string}) {
  return useCommunityPoliciesQuery(params)
}

export function useMattersQuery(params: {category?: string; query?: string}) {
  return useCommunityPoliciesQuery({...params, type: 'Matter'})
}

// REPRESENTATIVES

export function useRepresentativesQuery(params: {
  category?: string
  state?: string
  municipality?: string
  query?: string
}) {
  const agent = useAgent()

  return useInfiniteQuery({
    queryKey: [
      'representatives',
      params.category,
      params.state,
      params.municipality,
      params.query,
    ],
    queryFn: async ({pageParam}) => {
      const response = await fetchRepresentatives(agent, {
        category: params.category,
        state: params.state,
        cursor: pageParam,
      })

      let filtered = response.data

      // Additional client-side filtering
      if (params.category && params.category !== 'All') {
        filtered = filtered.filter(r => r.category === params.category)
      }
      if (params.state && params.state !== 'All') {
        filtered = filtered.filter(r => r.state === params.state)
      }
      if (params.municipality && params.municipality !== 'All') {
        filtered = filtered.filter(r => r.municipality === params.municipality)
      }
      if (params.query) {
        const q = params.query.toLowerCase()
        filtered = filtered.filter(
          r =>
            r.name.toLowerCase().includes(q) ||
            r.handle.toLowerCase().includes(q) ||
            r.affiliate.toLowerCase().includes(q),
        )
      }

      return {cursor: response.cursor, items: filtered}
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: lastPage => lastPage.cursor,
    staleTime: STALE_TIME,
  })
}
