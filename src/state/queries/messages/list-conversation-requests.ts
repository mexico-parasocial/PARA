import {useEffect} from 'react'
import {
  ChatBskyConvoDefs,
  type ChatBskyConvoListConvoRequests,
  ChatBskyGroupDefs,
} from '@atproto/api'
import {
  type InfiniteData,
  type QueryClient,
  useInfiniteQuery,
  useQueryClient,
} from '@tanstack/react-query'

import {useMessagesEventBus} from '#/state/messages/events'
import {createQueryKey} from '#/state/queries/util'
import {useAgent} from '#/state/session'
import {STALE} from '..'
import {getAgentDmServiceHeaders} from './utils/dm-service'

const listConvoRequestsQueryKeyRoot = 'list-convo-requests'

export const RQKEY_ROOT = listConvoRequestsQueryKeyRoot

export const createListConvoRequestsQueryKey = () =>
  createQueryKey(listConvoRequestsQueryKeyRoot)

export type ConvoRequestListQueryData = {
  pageParams: Array<string | undefined>
  pages: Array<ChatBskyConvoListConvoRequests.OutputSchema>
}

export type ConvoRequestItem =
  ChatBskyConvoListConvoRequests.OutputSchema['requests'][number]

export type FlattenedConvoRequestItem =
  | {type: 'incoming'; convo: ChatBskyConvoDefs.ConvoView}
  | {type: 'outgoing'; request: ChatBskyGroupDefs.JoinRequestConvoView}

function isJoinRequestConvoView(
  v: unknown,
): v is ChatBskyGroupDefs.JoinRequestConvoView {
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
    }, {})
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

export const useListConvoRequests = useListConvoRequestsQuery

export function flattenConvoRequests(
  data: ReturnType<typeof useListConvoRequestsQuery>['data'],
): FlattenedConvoRequestItem[] {
  if (!data) return []
  const items: FlattenedConvoRequestItem[] = []
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

export function optimisticUpdate(
  chatId: string,
  old: ConvoRequestListQueryData | undefined,
  updateFn: (convo: ChatBskyConvoDefs.ConvoView) => ChatBskyConvoDefs.ConvoView,
): ConvoRequestListQueryData | undefined {
  if (!old) return old

  return {
    ...old,
    pages: old.pages.map(page => ({
      ...page,
      requests: page.requests.map((item): ConvoRequestItem => {
        if (ChatBskyConvoDefs.isConvoView(item) && item.id === chatId) {
          return {
            ...updateFn(item),
            $type: 'chat.bsky.convo.defs#convoView',
          }
        }
        return item
      }),
    })),
  }
}

export function markAllRead(
  old: ConvoRequestListQueryData | undefined,
): ConvoRequestListQueryData | undefined {
  if (!old) return old

  return {
    ...old,
    pages: old.pages.map(page => ({
      ...page,
      requests: page.requests.map((item): ConvoRequestItem => {
        if (ChatBskyConvoDefs.isConvoView(item)) {
          return {
            ...item,
            $type: 'chat.bsky.convo.defs#convoView',
            unreadCount: 0,
          }
        }
        return item
      }),
    })),
  }
}

export function optimisticDelete(
  chatId: string,
  old: ConvoRequestListQueryData | undefined,
) {
  if (!old) return old

  return {
    ...old,
    pages: old.pages.map(page => ({
      ...page,
      requests: page.requests.filter(
        item => !ChatBskyConvoDefs.isConvoView(item) || item.id !== chatId,
      ),
    })),
  }
}

export function optimisticDeleteJoinRequest(
  convoId: string,
  old: ConvoRequestListQueryData | undefined,
) {
  if (!old) return old

  return {
    ...old,
    pages: old.pages.map(page => ({
      ...page,
      requests: page.requests.filter(
        item =>
          !ChatBskyGroupDefs.isJoinRequestConvoView(item) ||
          item.convoId !== convoId,
      ),
    })),
  }
}

export function* findAllProfilesInQueryData(
  queryClient: QueryClient,
  did: string,
) {
  const queryDatas = queryClient.getQueriesData<
    InfiniteData<ChatBskyConvoListConvoRequests.OutputSchema>
  >({
    queryKey: [RQKEY_ROOT],
  })
  for (const [_queryKey, queryData] of queryDatas) {
    if (!queryData?.pages) continue

    for (const page of queryData.pages) {
      for (const item of page.requests) {
        if (ChatBskyConvoDefs.isConvoView(item)) {
          for (const member of item.members) {
            if (member.did === did) {
              yield member
            }
          }
        } else if (ChatBskyGroupDefs.isJoinRequestConvoView(item)) {
          if (item.owner.did === did) {
            yield item.owner
          }
        }
      }
    }
  }
}
