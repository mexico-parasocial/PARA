import {type ChatBskyGroupRequestJoin} from '@atproto/api'
import {useMutation} from '@tanstack/react-query'

import {DM_SERVICE_HEADERS} from '#/lib/constants'
import {useAgent} from '#/state/session'

type Output = ChatBskyGroupRequestJoin.OutputSchema

export function useRequestJoinGroupChat({
  onSuccess,
  onError,
}: {
  onSuccess?: (data: Output) => void
  onError?: (error: Error) => void
} = {}) {
  const agent = useAgent()
  return useMutation({
    mutationFn: async ({code}: {code: string}) => {
      const {data} = await agent.api.chat.bsky.group.requestJoin(
        {code},
        {headers: DM_SERVICE_HEADERS, encoding: 'application/json'},
      )
      return data
    },
    onSuccess,
    onError,
  })
}
