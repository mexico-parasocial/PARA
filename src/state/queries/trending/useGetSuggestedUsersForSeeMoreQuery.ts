import {type QueryClient, useQuery} from '@tanstack/react-query'

import {
  aggregateUserInterests,
  createBskyTopicsHeader,
} from '#/lib/api/feed/utils'
import {getContentLanguages} from '#/state/preferences/languages'
import {STALE} from '#/state/queries'
import {usePreferencesQuery} from '#/state/queries/preferences'
import {useAppviewClient} from '#/state/session'
import {app} from '#/lexicons'

export type QueryProps = {
  category?: string | null
  limit?: number
}

export const getSuggestedUsersForSeeMoreQueryKeyRoot =
  'unspecced-suggested-users-for-explore'
export const createGetSuggestedUsersForSeeMoreQueryKey = (
  props: QueryProps,
) => [getSuggestedUsersForSeeMoreQueryKeyRoot, props.category, props.limit]

export function useGetSuggestedUsersForSeeMoreQuery(props: QueryProps = {}) {
  const client = useAppviewClient()
  const {data: preferences} = usePreferencesQuery()

  return useQuery({
    staleTime: STALE.MINUTES.THREE,
    queryKey: createGetSuggestedUsersForSeeMoreQueryKey(props),
    queryFn: async () => {
      const contentLangs = getContentLanguages().join(',')
      const userInterests = aggregateUserInterests(preferences)

      const data = await client.call(
        app.bsky.unspecced.getSuggestedUsersForSeeMore,
        {
          category: props.category ?? undefined,
          limit: props.limit || 50,
        },
        {
          headers: {
            ...createBskyTopicsHeader(userInterests),
            'Accept-Language': contentLangs,
          },
        },
      )

      return {...data, recId: data.recIdStr}
    },
  })
}

export function* findAllProfilesInQueryData(
  queryClient: QueryClient,
  did: string,
): Generator<app.bsky.actor.defs.ProfileView, void> {
  const responses =
    queryClient.getQueriesData<app.bsky.unspecced.getSuggestedUsersForSeeMore.$OutputBody>(
      {
        queryKey: [getSuggestedUsersForSeeMoreQueryKeyRoot],
      },
    )
  for (const [_key, response] of responses) {
    if (!response) {
      continue
    }

    for (const actor of response.actors) {
      if (actor.did === did) {
        yield actor
      }
    }
  }
}
