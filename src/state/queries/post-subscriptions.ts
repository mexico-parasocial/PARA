import {type AtUriString} from '@atproto/syntax'
import {t} from '@lingui/core/macro'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'

import {useAgent, useSession} from '#/state/session'
import * as Toast from '#/components/Toast'
import {com} from '#/lexicons'

export type PostSubscription = {
  post: string
  reply: boolean
  quote: boolean
  indexedAt?: string
}

type PutPostSubscriptionInput = {
  post: string
  reply: boolean
  quote: boolean
}

export const RQKEY_getPostSubscription = (postUri: string) => [
  'post-subscription',
  postUri,
]

export function usePostSubscriptionQuery(postUri: string) {
  const agent = useAgent()
  const {hasSession} = useSession()

  return useQuery({
    queryKey: RQKEY_getPostSubscription(postUri),
    enabled: hasSession && Boolean(postUri),
    queryFn: async () => {
      return agent.appviewClient.call(
        com.para.notification.getPostSubscription,
        {
          post: postUri as AtUriString,
        },
      )
    },
  })
}

export function usePostSubscriptionMutation() {
  const agent = useAgent()
  const queryClient = useQueryClient()

  return useMutation<
    PostSubscription,
    Error,
    PutPostSubscriptionInput,
    {previous?: PostSubscription}
  >({
    mutationFn: async input => {
      return agent.appviewClient.call(
        com.para.notification.putPostSubscription,
        input as com.para.notification.putPostSubscription.$InputBody,
      )
    },
    async onMutate(input) {
      const queryKey = RQKEY_getPostSubscription(input.post)
      await queryClient.cancelQueries({queryKey})
      const previous = queryClient.getQueryData<PostSubscription>(queryKey)
      queryClient.setQueryData<PostSubscription>(queryKey, {
        post: input.post,
        reply: input.reply,
        quote: input.quote,
        indexedAt: previous?.indexedAt,
      })
      return {previous}
    },
    onError(_, input, context) {
      queryClient.setQueryData(
        RQKEY_getPostSubscription(input.post),
        context?.previous,
      )
      Toast.show(t`Failed to update lobbying follow`, {type: 'error'})
    },
    onSettled(_data, _error, input) {
      queryClient.invalidateQueries({
        queryKey: RQKEY_getPostSubscription(input.post),
      })
    },
  })
}
