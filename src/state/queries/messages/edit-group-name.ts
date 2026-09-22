import {type $Typed} from '@atproto/lex'
import {
  type InfiniteData,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'

import {getDmServiceHeadersForServiceUrl} from '#/lib/constants'
import {logger} from '#/logger'
import {useAgent} from '#/state/session'
import {chat} from '#/lexicons'
import * as bsky from '#/types/bsky'
import {RQKEY as CONVO_KEY} from './conversation'
import {RQKEY_ROOT as CONVO_LIST_KEY} from './list-conversations'

export function useEditGroupName(
  convoId: string | undefined,
  {
    onSuccess,
    onError,
  }: {
    onSuccess?: (data: chat.bsky.group.editGroup.$OutputBody) => void
    onError?: (error: Error) => void
  },
) {
  const queryClient = useQueryClient()
  const agent = useAgent()

  return useMutation({
    mutationFn: async ({name: groupName}: {name: string}) => {
      if (!convoId) throw new Error('No convoId provided')
      return await agent.chatClient.call(
        chat.bsky.group.editGroup,
        {convoId, name: groupName},
        {
          headers: getDmServiceHeadersForServiceUrl(agent.service.toString()),
          encoding: 'application/json',
        },
      )
    },
    onMutate: ({name: groupName}) => {
      if (!convoId) return

      const prevConvo =
        queryClient.getQueryData<chat.bsky.convo.defs.ConvoView>(
          CONVO_KEY(convoId),
        )
      const prevListEntries = queryClient.getQueriesData<
        InfiniteData<chat.bsky.convo.listConvos.$OutputBody>
      >({queryKey: [CONVO_LIST_KEY]})

      // Update for a single chat thread
      queryClient.setQueryData<chat.bsky.convo.defs.ConvoView>(
        CONVO_KEY(convoId),
        prev => {
          if (!prev) return
          if (!bsky.isType(chat.bsky.convo.defs.groupConvo, prev.kind))
            return prev
          // the guard only asserts the `$type` tag, so re-assert the typed shape
          const kind = prev.kind
          return {
            ...prev,
            kind: {
              ...kind,
              name: groupName,
            },
          }
        },
      )

      // Update for the chat list
      queryClient.setQueriesData<
        InfiniteData<chat.bsky.convo.listConvos.$OutputBody>
      >({queryKey: [CONVO_LIST_KEY]}, prev => {
        if (!prev?.pages) return
        return {
          ...prev,
          pages: prev.pages.map(page => ({
            ...page,
            convos: page.convos.map(convo => {
              if (convo.id !== convoId) return convo
              if (!bsky.isType(chat.bsky.convo.defs.groupConvo, convo.kind))
                return convo
              // the guard only asserts the `$type` tag, so re-assert the shape
              const kind = convo.kind
              return {
                ...convo,
                kind: {
                  ...kind,
                  name: groupName,
                },
              }
            }),
          })),
        }
      })

      return {prevConvo, prevListEntries}
    },
    onSuccess: data => {
      onSuccess?.(data)
    },
    onError: (e, _variables, context) => {
      logger.error(e)
      if (context?.prevConvo && convoId) {
        queryClient.setQueryData(CONVO_KEY(convoId), context.prevConvo)
      }
      if (context?.prevListEntries) {
        for (const [key, data] of context.prevListEntries) {
          queryClient.setQueryData(key, data)
        }
      }
      onError?.(e)
    },
  })
}
