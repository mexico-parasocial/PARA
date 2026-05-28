import {
  type AppBskyActorDefs,
  type AppBskyUnspeccedGetSuggestedUsers,
} from '@atproto/api'
import {type QueryClient, useQuery} from '@tanstack/react-query'

import {
  aggregateUserInterests,
  createBskyTopicsHeader,
} from '#/lib/api/feed/utils'
import {logger} from '#/logger'
import {getContentLanguages} from '#/state/preferences/languages'
import {STALE} from '#/state/queries'
import {usePreferencesQuery} from '#/state/queries/preferences'
import {useAgent} from '#/state/session'

export type QueryProps = {
  category?: string | null
  limit?: number
  enabled?: boolean
  overrideInterests?: string[]
}

export const getSuggestedUsersQueryKeyRoot = 'unspecced-suggested-users'
export const createGetSuggestedUsersQueryKey = (props: QueryProps) => [
  getSuggestedUsersQueryKeyRoot,
  props.category,
  props.limit,
  props.overrideInterests?.join(','),
]

export function useGetSuggestedUsersQuery(props: QueryProps) {
  const agent = useAgent()
  const {data: preferences} = usePreferencesQuery()

  return useQuery({
    enabled: !!preferences && props.enabled !== false,
    staleTime: STALE.MINUTES.THREE,
    queryKey: createGetSuggestedUsersQueryKey(props),
    queryFn: async () => {
      const contentLangs = getContentLanguages().join(',')
      const userInterests = aggregateUserInterests(preferences)
      const limit = props.limit || 10

      const interests =
        props.overrideInterests && props.overrideInterests.length > 0
          ? props.overrideInterests.join(',')
          : userInterests

      try {
        const {data} = await agent.app.bsky.unspecced.getSuggestedUsers(
          {
            category: props.category ?? undefined,
            limit,
          },
          {
            headers: {
              ...createBskyTopicsHeader(interests),
              'Accept-Language': contentLangs,
            },
          },
        )
        // FALLBACK: if no results for the default feed, try again without
        // interests specified.
        if (!props.category && data.actors.length === 0) {
          logger.error(
            `Did not get any suggested users, falling back - interests: ${interests}`,
          )
          const {data: fallbackData} =
            await agent.app.bsky.unspecced.getSuggestedUsers(
              {
                limit,
              },
              {
                headers: {
                  'Accept-Language': contentLangs,
                },
              },
            )
          return fallbackData
        }

        return data
      } catch (error) {
        logger.warn(
          'Suggested users request failed, retrying without filters',
          {
            category: props.category ?? 'all',
            error,
          },
        )
      }

      const {data} = await agent.app.bsky.unspecced.getSuggestedUsers(
        {
          limit,
        },
        {
          headers: {
            'Accept-Language': contentLangs,
          },
        },
      )

      return data
    },
  })
}

export function* findAllProfilesInQueryData(
  queryClient: QueryClient,
  did: string,
): Generator<AppBskyActorDefs.ProfileView, void> {
  const responses =
    queryClient.getQueriesData<AppBskyUnspeccedGetSuggestedUsers.OutputSchema>({
      queryKey: [getSuggestedUsersQueryKeyRoot],
    })
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
