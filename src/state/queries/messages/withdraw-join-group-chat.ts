import {type ChatBskyGroupWithdrawJoinRequest} from '@atproto/api'
import {useMutation} from '@tanstack/react-query'

import {DM_SERVICE_HEADERS} from '#/lib/constants'
import {useAgent} from '#/state/session'

type Output = ChatBskyGroupWithdrawJoinRequest.OutputSchema

export function useWithdrawJoinGroupChatRequest({
  onSuccess,
  onError,
}: {
  onSuccess?: (data: Output) => void
  onError?: (error: Error) => void
} = {}) {
  const agent = useAgent()
  return useMutation({
    mutationFn: async ({convoId}: {convoId: string}) => {
      const {data} = await agent.api.chat.bsky.group.withdrawJoinRequest(
        {convoId},
        {headers: DM_SERVICE_HEADERS, encoding: 'application/json'},
      )
      return data
    },
    onSuccess,
    onError,
  })
}
