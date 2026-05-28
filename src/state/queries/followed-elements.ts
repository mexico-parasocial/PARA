import {
  AtUri,
  type BskyAgent,
  type ComAtprotoRepoListRecords,
} from '@atproto/api'
import {TID} from '@atproto/common-web'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'

import {PARA_FOLLOWED_ELEMENT_COLLECTION} from '#/lib/api/para-lexicons'
import {useAgent, useSession} from '#/state/session'
import {getFollowedItems, setFollowedItems} from '#/state/topics/topicStorage'
import {
  type FollowedItem,
  type FollowedItemType,
} from '#/state/topics/topicTypes'

type FollowedElementRecord = {
  $type: typeof PARA_FOLLOWED_ELEMENT_COLLECTION
  type: FollowedItemType
  identifier: string
  displayName: string
  subjectUri?: string
  community?: string
  color?: string
  notificationsEnabled: boolean
  createdAt: string
  updatedAt: string
}

export type FollowedElementInput = {
  type: FollowedItemType
  identifier: string
  displayName: string
  uri?: string
  community?: string
  color?: string
  notificationsEnabled?: boolean
}

export type FollowedElementUpdate = Partial<
  Pick<
    FollowedItem,
    'displayName' | 'uri' | 'community' | 'color' | 'notificationsEnabled'
  >
>

export const followedElementsQueryKey = ['followed-elements'] as const

function isFollowedElementRecord(
  value: unknown,
): value is FollowedElementRecord {
  if (!value || typeof value !== 'object') return false
  const record = value as Partial<FollowedElementRecord>
  return (
    record.$type === PARA_FOLLOWED_ELEMENT_COLLECTION &&
    typeof record.type === 'string' &&
    typeof record.identifier === 'string' &&
    typeof record.displayName === 'string' &&
    typeof record.createdAt === 'string'
  )
}

function dateToMs(value: string | undefined) {
  if (!value) return Date.now()
  const time = new Date(value).getTime()
  return Number.isFinite(time) ? time : Date.now()
}

function recordToFollowedItem(
  record: ComAtprotoRepoListRecords.Record,
): FollowedItem | null {
  if (!isFollowedElementRecord(record.value)) return null

  return {
    id: record.uri,
    type: record.value.type,
    identifier: record.value.identifier,
    displayName: record.value.displayName,
    uri: record.value.subjectUri,
    community: record.value.community,
    color: record.value.color,
    notificationsEnabled: Boolean(record.value.notificationsEnabled),
    followedAt: dateToMs(record.value.createdAt),
    updatedAt: dateToMs(record.value.updatedAt),
  }
}

function followedItemToRecord(
  item: FollowedElementInput,
  existing?: FollowedItem,
): FollowedElementRecord {
  const now = new Date().toISOString()
  return {
    $type: PARA_FOLLOWED_ELEMENT_COLLECTION,
    type: item.type,
    identifier: item.identifier.trim(),
    displayName: item.displayName.trim(),
    subjectUri: item.uri,
    community: item.community,
    color: item.color,
    notificationsEnabled: item.notificationsEnabled ?? true,
    createdAt: existing?.followedAt
      ? new Date(existing.followedAt).toISOString()
      : now,
    updatedAt: now,
  }
}

function normalizeIdentifier(identifier: string) {
  return identifier.trim().toLowerCase()
}

function sameFollowedElement(a: FollowedItem, b: FollowedElementInput) {
  return (
    a.type === b.type &&
    normalizeIdentifier(a.identifier) === normalizeIdentifier(b.identifier)
  )
}

function getAtUriRkey(uri: string) {
  try {
    return new AtUri(uri).rkey
  } catch {
    return undefined
  }
}

async function listRemoteFollowedElements({
  agent,
  repo,
}: {
  agent: BskyAgent
  repo: string
}) {
  const items: FollowedItem[] = []
  let cursor: string | undefined

  do {
    const res = await agent.com.atproto.repo.listRecords({
      repo,
      collection: PARA_FOLLOWED_ELEMENT_COLLECTION,
      limit: 100,
      cursor,
    })
    for (const record of res.data.records) {
      const item = recordToFollowedItem(record)
      if (item) items.push(item)
    }
    cursor = res.data.cursor
  } while (cursor)

  return items.sort((a, b) => b.followedAt - a.followedAt)
}

export function useFollowedElementsQuery() {
  const agent = useAgent()
  const {currentAccount} = useSession()

  return useQuery({
    queryKey: [...followedElementsQueryKey, currentAccount?.did],
    enabled: Boolean(currentAccount?.did),
    initialData: () => getFollowedItems(),
    queryFn: async () => {
      if (!currentAccount?.did) return []

      try {
        const items = await listRemoteFollowedElements({
          agent,
          repo: currentAccount.did,
        })
        setFollowedItems(items)
        return items
      } catch (e) {
        return getFollowedItems()
      }
    },
  })
}

export function useAddFollowedElementMutation() {
  const agent = useAgent()
  const {currentAccount} = useSession()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (item: FollowedElementInput) => {
      if (!currentAccount?.did) throw new Error('Not signed in')

      const current = await listRemoteFollowedElements({
        agent,
        repo: currentAccount.did,
      })
      const existing = current.find(candidate =>
        sameFollowedElement(candidate, item),
      )
      if (existing) return existing

      const record = followedItemToRecord(item)
      const res = await agent.com.atproto.repo.putRecord({
        repo: currentAccount.did,
        collection: PARA_FOLLOWED_ELEMENT_COLLECTION,
        rkey: TID.nextStr(),
        record,
      })

      return {
        id: res.data.uri,
        type: record.type,
        identifier: record.identifier,
        displayName: record.displayName,
        uri: record.subjectUri,
        community: record.community,
        color: record.color,
        notificationsEnabled: record.notificationsEnabled,
        followedAt: dateToMs(record.createdAt),
        updatedAt: dateToMs(record.updatedAt),
      } satisfies FollowedItem
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: followedElementsQueryKey})
    },
  })
}

export function useUpdateFollowedElementMutation() {
  const agent = useAgent()
  const {currentAccount} = useSession()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      item,
      updates,
    }: {
      item: FollowedItem
      updates: FollowedElementUpdate
    }) => {
      if (!currentAccount?.did) throw new Error('Not signed in')

      const rkey = getAtUriRkey(item.id)
      if (!rkey) {
        setFollowedItems(
          getFollowedItems().map(candidate =>
            candidate.id === item.id
              ? {...candidate, ...updates, updatedAt: Date.now()}
              : candidate,
          ),
        )
        return
      }

      const next: FollowedElementInput = {
        type: item.type,
        identifier: item.identifier,
        displayName: updates.displayName ?? item.displayName,
        uri: updates.uri ?? item.uri,
        community: updates.community ?? item.community,
        color: updates.color ?? item.color,
        notificationsEnabled:
          updates.notificationsEnabled ?? item.notificationsEnabled,
      }

      await agent.com.atproto.repo.putRecord({
        repo: currentAccount.did,
        collection: PARA_FOLLOWED_ELEMENT_COLLECTION,
        rkey,
        record: followedItemToRecord(next, item),
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: followedElementsQueryKey})
    },
  })
}

export function useRemoveFollowedElementMutation() {
  const agent = useAgent()
  const {currentAccount} = useSession()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (item: FollowedItem) => {
      if (!currentAccount?.did) throw new Error('Not signed in')

      const rkey = getAtUriRkey(item.id)
      if (!rkey) {
        setFollowedItems(
          getFollowedItems().filter(candidate => candidate.id !== item.id),
        )
        return
      }

      await agent.com.atproto.repo.deleteRecord({
        repo: currentAccount.did,
        collection: PARA_FOLLOWED_ELEMENT_COLLECTION,
        rkey,
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: followedElementsQueryKey})
    },
  })
}
