import {t} from '@lingui/core/macro'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'

import {useAgent, useSession} from '#/state/session'
import * as Toast from '#/components/Toast'

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
      const params = new URLSearchParams({post: postUri})
      const res = await agent.fetchHandler(
        `/xrpc/com.para.notification.getPostSubscription?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            accept: 'application/json',
          },
        },
      )

      if (!res.ok) {
        throw new Error(await getErrorMessage(res))
      }

      return (await res.json()) as PostSubscription
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
      const res = await agent.fetchHandler(
        '/xrpc/com.para.notification.putPostSubscription',
        {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'content-type': 'application/json',
          },
          body: JSON.stringify(input),
        },
      )

      if (!res.ok) {
        throw new Error(await getErrorMessage(res))
      }

      return (await res.json()) as PostSubscription
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

async function getErrorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json()
    return body?.message || body?.error || res.statusText
  } catch {
    return res.statusText
  }
}
