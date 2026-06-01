import {useQuery} from '@tanstack/react-query'

import {DM_SERVICE_HEADERS} from '#/lib/constants'
import {STALE} from '#/state/queries'
import {createQueryKey} from '#/state/queries/util'
import {useAgent} from '#/state/session'

const chatActorStatusQueryKey = () =>
  createQueryKey('chat-actor-status', {}, {persistedVersion: 1})

export function useChatActorStatusQuery() {
  const agent = useAgent()

  return useQuery({
    queryKey: chatActorStatusQueryKey(),
    queryFn: async () => {
      const {data} = await agent.chat.bsky.actor.getStatus(
        {},
        {headers: DM_SERVICE_HEADERS},
      )

      return data
    },
    staleTime: STALE.INFINITY,
    gcTime: STALE.INFINITY,
  })
}
