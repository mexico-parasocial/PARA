import {type ChatBskyConvoGetConvoForMembers} from '@atproto/api'
import {useMutation, useQueryClient} from '@tanstack/react-query'

import {logger} from '#/logger'
import {useAgent} from '#/state/session'
import {precacheConvoQuery} from './conversation'
import {getAgentDmServiceHeaders} from './utils/dm-service'

export function useGetConvoForMembers({
  onSuccess,
  onError,
}: {
  onSuccess?: (data: ChatBskyConvoGetConvoForMembers.OutputSchema) => void
  onError?: (error: Error) => void
}) {
  const queryClient = useQueryClient()
  const agent = useAgent()

  return useMutation({
    mutationFn: async (members: string[]) => {
      const {data} = await agent.chat.bsky.convo.getConvoForMembers(
        {members: members},
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
