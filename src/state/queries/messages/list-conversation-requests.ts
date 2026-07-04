import {useEffect} from 'react'
import {
  ChatBskyConvoDefs,
  ChatBskyGroupDefs,
  type JoinRequestConvoView,
} from '@atproto/api'
import {useInfiniteQuery, useQueryClient} from '@tanstack/react-query'

import {useMessagesEventBus} from '#/state/messages/events'
import {createQueryKey} from '#/state/queries/util'
import {useAgent} from '#/state/session'
import {STALE} from '..'
import {getAgentDmServiceHeaders} from './utils/dm-service'

const listConvoRequestsQueryKeyRoot = 'list-convo-requests'

export const createListConvoRequestsQueryKey = () =>
  createQueryKey(listConvoRequestsQueryKeyRoot)

export type ConvoRequestItem =
  | {type: 'incoming'; convo: ChatBskyConvoDefs.ConvoView}
  | {
      type: 'outgoing'
      request: JoinRequestConvoView
    }

function isJoinRequestConvoView(
  v: unknown,
): v is JoinRequestConvoView {
  return ChatBskyGroupDefs.isJoinRequestConvoView(v)
}

export function useListConvoRequestsQuery({enabled}: {enabled?: boolean} = {}) {
  const agent = useAgent()
  const queryClient = useQueryClient()
  const messagesBus = useMessagesEventBus()
  const isEnabled = enabled !== false

  useEffect(() => {
    if (!isEnabled) return

    return messagesBus.on(event => {
      if (event.type !== 'logs') return
      for (const log of event.logs) {
        if (
          ChatBskyConvoDefs.isLogIncomingJoinRequest(log) ||
          ChatBskyConvoDefs.isLogApproveJoinRequest(log) ||
          ChatBskyConvoDefs.isLogRejectJoinRequest(log)
        ) {
          void queryClient.invalidateQueries({
            queryKey: createListConvoRequestsQueryKey(),
          })
          return
        }
      }
    })
  }, [isEnabled, messagesBus, queryClient])

  return useInfiniteQuery({
    enabled: isEnabled,
    queryKey: createListConvoRequestsQueryKey(),
    queryFn: async ({pageParam}) => {
      const {data} = await agent.chat.bsky.convo.listConvoRequests(
        {cursor: pageParam, limit: 20},
        {headers: getAgentDmServiceHeaders(agent)},
      )
      return data
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: page => page.cursor,
    staleTime: STALE.MINUTES.ONE,
  })
}

export function flattenConvoRequests(
  data: ReturnType<typeof useListConvoRequestsQuery>['data'],
): ConvoRequestItem[] {
  if (!data) return []
  const items: ConvoRequestItem[] = []
  for (const page of data.pages) {
    for (const item of page.requests) {
      if (ChatBskyConvoDefs.isConvoView(item)) {
        items.push({type: 'incoming', convo: item})
      } else if (isJoinRequestConvoView(item)) {
        items.push({type: 'outgoing', request: item})
      }
    }
  }
  return items
}
