import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'

import {useAgent} from '#/state/session'

export interface AgentChatMessage {
  id: string
  text: string
  sender: 'user' | 'agent'
  createdAt: string
}

const RQKEY = (agentId: string) => ['agent-chat', agentId]

export function useAgentChatQuery(agentId: string) {
  const agent = useAgent()

  return useQuery({
    queryKey: RQKEY(agentId),
    queryFn: async () => {
      const {data} = await agent.call('com.para.agent.getConversation', {
        agentId,
      })
      return (data.messages ?? []) as AgentChatMessage[]
    },
    staleTime: 1000 * 30, // 30 seconds
  })
}

export function useSendAgentMessageMutation(agentId: string) {
  const agent = useAgent()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (text: string) => {
      const {data} = await agent.call(
        'com.para.agent.sendMessage',
        undefined,
        {agentId, text},
        {encoding: 'application/json'},
      )
      return data.message as AgentChatMessage
    },
    onMutate: async text => {
      await queryClient.cancelQueries({queryKey: RQKEY(agentId)})

      const previousMessages =
        queryClient.getQueryData<AgentChatMessage[]>(RQKEY(agentId)) ?? []
      const optimisticMessage: AgentChatMessage = {
        id: `pending-${Date.now()}`,
        text,
        sender: 'user',
        createdAt: new Date().toISOString(),
      }

      queryClient.setQueryData<AgentChatMessage[]>(RQKEY(agentId), [
        ...previousMessages,
        optimisticMessage,
      ])

      return {previousMessages}
    },
    onError: (_err, _text, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(RQKEY(agentId), context.previousMessages)
      }
    },
    onSuccess: message => {
      queryClient.setQueryData<AgentChatMessage[]>(
        RQKEY(agentId),
        currentMessages => {
          const nextMessages = currentMessages ?? []
          if (nextMessages.some(item => item.id === message.id)) {
            return nextMessages
          }
          return [...nextMessages, message]
        },
      )
      queryClient.invalidateQueries({queryKey: RQKEY(agentId)})
    },
  })
}
