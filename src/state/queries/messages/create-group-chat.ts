import {type ChatBskyGroupCreateGroup} from '@atproto/api'
import {useMutation, useQueryClient} from '@tanstack/react-query'

import {logger} from '#/logger'
import {useAgent} from '#/state/session'
import {precacheConvoQuery} from './conversation'
import {getAgentDmServiceHeaders} from './utils/dm-service'

export function useCreateGroupChat({
  onSuccess,
  onError,
}: {
  onSuccess?: (data: ChatBskyGroupCreateGroup.OutputSchema) => void
  onError?: (error: Error) => void
}) {
  const queryClient = useQueryClient()
  const agent = useAgent()

  return useMutation({
    mutationFn: async ({name, members}: {name: string; members: string[]}) => {
      const {data} = await agent.chat.bsky.group.createGroup(
        {name, members},
        {headers: getAgentDmServiceHeaders(agent)},
      )

      return data
    },
    onSuccess: data => {
      precacheConvoQuery(queryClient, data.convo)
      onSuccess?.(data)
    },
    onError: error => {
      logger.error(error)
      onError?.(error)
    },
  })
}
