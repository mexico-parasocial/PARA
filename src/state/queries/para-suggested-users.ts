import {type AppBskyActorDefs} from '@atproto/api'
import {useQuery} from '@tanstack/react-query'

import {type CivicCategoryKey} from '#/lib/interests'
import {STALE} from '#/state/queries'
import {useAgent} from '#/state/session'

const RQKEY_ROOT = 'para-suggested-users'

export type ParaSuggestedUsersResponse = {
  actors: AppBskyActorDefs.ProfileView[]
  cursor?: string
}

export type ParaSuggestedUsersParams = {
  category?: CivicCategoryKey
  interests?: string[]
  limit?: number
}

const queryKey = (params: ParaSuggestedUsersParams) => [
  RQKEY_ROOT,
  params.category ?? '',
  (params.interests ?? []).join(','),
  params.limit ?? 25,
]

export function useParaSuggestedUsersQuery(params: ParaSuggestedUsersParams) {
  const agent = useAgent()
  return useQuery<ParaSuggestedUsersResponse>({
    staleTime: STALE.MINUTES.FIVE,
    placeholderData: previous => previous,
    queryKey: queryKey(params),
    queryFn: async () => {
      const res = await agent.call('com.para.actor.getSuggestedUsers', {
        category: params.category,
        interests: params.interests,
        limit: params.limit ?? 25,
      })
      return res.data as ParaSuggestedUsersResponse
    },
  })
}
