import {useMemo} from 'react'

import {
  type CivicCategoryKey,
  PARA_INTEREST_KEYS,
  useInterestsDisplayNames,
} from '#/lib/interests'
import {useActorSearch} from '#/state/queries/actor-search'
import {
  type ParaSuggestedUsersResponse,
  useParaSuggestedUsersQuery,
} from '#/state/queries/para-suggested-users'
import {useGetSuggestedUsersQuery} from '#/state/queries/trending/useGetSuggestedUsersQuery'

const PARA_KEY_SET = new Set<string>(PARA_INTEREST_KEYS)

type SuggestedResult = {
  data: ParaSuggestedUsersResponse | undefined
  isLoading: boolean
  error: unknown
  isRefetching: boolean
  refetch: () => void
}

/**
 * Conditional hook. Used in onboarding suggested-accounts and in the Explore
 * screen.
 *
 * - When `category` is one of the 6 PARA civic pillars, delegate to the new
 *   `com.para.actor.getSuggestedUsers` endpoint, which ranks by PARA-native
 *   signals (community overlap, compass proximity, recent post tags).
 * - Otherwise (legacy art/gaming/tech topics, or "all"), fall back to the
 *   upstream Bluesky curated endpoint.
 * - For non-English users, the upstream flow additionally runs an actor
 *   search using the translated category name.
 */
export function useSuggestedUsers({
  category = null,
  search = false,
  overrideInterests,
}: {
  category?: string | null
  /**
   * If true, we'll search for users using the translated value of `category`,
   * based on the user's "app language setting
   */
  search?: boolean
  /**
   * In onboarding, interests haven't been saved to prefs yet, so we need to
   * pass them down through here
   */
  overrideInterests?: string[]
}): SuggestedResult {
  const interestsDisplayNames = useInterestsDisplayNames()
  const useParaEndpoint = !search && !!category && PARA_KEY_SET.has(category)

  const para = useParaSuggestedUsersQuery({
    category: useParaEndpoint ? (category as CivicCategoryKey) : undefined,
    interests: overrideInterests,
  })
  const curated = useGetSuggestedUsersQuery({
    enabled: !search && !useParaEndpoint,
    category,
    overrideInterests,
  })
  const searched = useActorSearch({
    enabled: !!search,
    query: category ? interestsDisplayNames[category] : '',
    limit: 10,
  })

  return useMemo<SuggestedResult>(() => {
    if (useParaEndpoint) {
      return {
        data: para.data,
        isLoading: para.isLoading,
        error: para.error,
        isRefetching: para.isRefetching,
        refetch: () => void para.refetch(),
      }
    }
    if (search) {
      return {
        data: searched?.data
          ? {actors: searched.data.pages.flatMap(p => p.actors) ?? []}
          : undefined,
        isLoading: searched.isLoading,
        error: searched.error,
        isRefetching: searched.isRefetching,
        refetch: () => void searched.refetch(),
      }
    }
    return {
      data: curated.data,
      isLoading: curated.isLoading,
      error: curated.error,
      isRefetching: curated.isRefetching,
      refetch: () => void curated.refetch(),
    }
  }, [curated, searched, para, search, useParaEndpoint])
}
