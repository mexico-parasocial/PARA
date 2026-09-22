import {useEffect} from 'react'
import {type QueryClient, useQuery, useQueryClient} from '@tanstack/react-query'

import {useMessagesEventBus} from '#/state/messages/events'
import {STALE} from '#/state/queries'
import {createQueryKey} from '#/state/queries/util'
import {useChatClient} from '#/state/session'
import {chat} from '#/lexicons'
import * as bsky from '#/types/bsky'

const RQKEY_ROOT = 'listConvoMembers'
export const listConvoMembersQueryKey = (convoId: string) =>
  createQueryKey(RQKEY_ROOT, {convoId})

// group chat size is 50, so should fetch the whole list in one go
const LIMIT = 50

export function useListConvoMembersQuery({
  convoId,
  placeholderData,
}: {
  convoId: string
  placeholderData?: chat.bsky.actor.defs.ProfileViewBasic[]
}) {
  const client = useChatClient()
  const queryClient = useQueryClient()
  const messagesBus = useMessagesEventBus()

  useEffect(() => {
    const unsub = messagesBus.on(
      ev => {
        if (ev.type !== 'logs') return

        function mutateList(
          fn: (
            update: chat.bsky.actor.defs.ProfileViewBasic[],
          ) => chat.bsky.actor.defs.ProfileViewBasic[],
        ) {
          queryClient.setQueryData<chat.bsky.actor.defs.ProfileViewBasic[]>(
            listConvoMembersQueryKey(convoId),
            old => {
              if (!old) return // query doesn't exist yet, skip
              return fn(old)
            },
          )
        }

        for (const log of ev.logs) {
          if (bsky.isType(chat.bsky.convo.defs.logAddMember, log)) {
            const data = log.message.data
            if (
              bsky.isType(chat.bsky.convo.defs.systemMessageDataAddMember, data)
            ) {
              const newMember = log.relatedProfiles.find(
                r => r.did === data.member.did,
              )
              if (newMember) {
                mutateList(list =>
                  list.some(m => m.did === newMember.did)
                    ? list
                    : list.concat(newMember),
                )
              }
            }
          } else if (bsky.isType(chat.bsky.convo.defs.logRemoveMember, log)) {
            const data = log.message.data
            if (
              bsky.isType(
                chat.bsky.convo.defs.systemMessageDataRemoveMember,
                data,
              )
            ) {
              mutateList(list => list.filter(m => m.did !== data.member.did))
            }
          } else if (bsky.isType(chat.bsky.convo.defs.logMemberJoin, log)) {
            const data = log.message.data
            if (
              bsky.isType(
                chat.bsky.convo.defs.systemMessageDataMemberJoin,
                data,
              )
            ) {
              const newMember = log.relatedProfiles.find(
                r => r.did === data.member.did,
              )
              if (newMember) {
                mutateList(list =>
                  list.some(m => m.did === newMember.did)
                    ? list
                    : list.concat(newMember),
                )
              }
            }
          } else if (bsky.isType(chat.bsky.convo.defs.logMemberLeave, log)) {
            const data = log.message.data
            if (
              bsky.isType(
                chat.bsky.convo.defs.systemMessageDataMemberLeave,
                data,
              )
            ) {
              mutateList(list => list.filter(m => m.did !== data.member.did))
            }
          }
        }
      },
      {convoId},
    )
    return () => unsub()
  }, [convoId, messagesBus, queryClient])

  return useQuery({
    queryKey: listConvoMembersQueryKey(convoId),
    queryFn: async () => {
      /*
       * Both locals are annotated because the loop is self-referential: `data`
       * is inferred from a call whose params include `cursor`, so leaving
       * `cursor` to be inferred from `data.cursor` is circular. Annotating
       * `members` with the exported profile type also keeps the hook's result
       * type unchanged for consumers.
       */
      const members: chat.bsky.actor.defs.ProfileViewBasic[] = []
      let cursor: string | undefined

      do {
        const data = await client.call(chat.bsky.convo.getConvoMembers, {
          convoId,
          cursor,
          limit: LIMIT,
        })
        members.push(...data.members)
        cursor = data.cursor
      } while (cursor)

      return members
    },
    staleTime: STALE.MINUTES.THIRTY,
    placeholderData,
  })
}

export function* findAllProfilesInQueryData(
  queryClient: QueryClient,
  did: string,
): Generator<chat.bsky.actor.defs.ProfileViewBasic, void> {
  const queryDatas = queryClient.getQueriesData<
    chat.bsky.actor.defs.ProfileViewBasic[]
  >({
    queryKey: [RQKEY_ROOT],
  })
  for (const [_queryKey, queryData] of queryDatas) {
    if (!queryData) continue
    for (const member of queryData) {
      if (member.did === did) {
        yield member
      }
    }
  }
}
