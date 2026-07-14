import {useQuery} from '@tanstack/react-query'

import {DM_SERVICE_HEADERS} from '#/lib/constants'
import {isChatServiceUnavailableError} from '#/lib/strings/errors'
import {STALE} from '#/state/queries'
import {createQueryKey} from '#/state/queries/util'
import {useAgent} from '#/state/session'

const chatActorStatusQueryKey = () => createQueryKey('chat-actor-status', {})

export function useChatActorStatusQuery() {
  const agent = useAgent()

  return useQuery({
    queryKey: chatActorStatusQueryKey(),
    queryFn: async () => {
      try {
        const {data} = await agent.chat.bsky.actor.getStatus(
          {},
          {headers: DM_SERVICE_HEADERS},
        )

        return data
      } catch (e) {
        if (isChatServiceUnavailableError(e)) {
          return {
            chatDisabled: true,
            acceptDisabled: false,
            canCreateGroups: false,
            groupMemberLimit: 0,
          }
        }
        throw e
      }
    },
    staleTime: STALE.INFINITY,
    gcTime: STALE.INFINITY,
  })
}
