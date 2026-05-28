import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'

import {STALE} from '#/state/queries'
import {useAgent} from '#/state/session'

const RQKEY_ROOT = 'community-shared-content'
const COMMUNITY_BOARDS_RQKEY_ROOT = 'community-boards'

export type SharedContentType =
  | 'post'
  | 'cabildeo'
  | 'collection'
  | 'mapInitiative'
  | 'external'

export type SharedContentSubject = {
  uri: string
  cid: string
}

export type CommunitySharedContentView = {
  uri: string
  cid: string
  subject: SharedContentSubject
  communityUri: string
  sourceCommunityUri?: string
  contentType: SharedContentType
  sharedBy: string
  sharedByHandle?: string
  note?: string
  visibility?: 'community' | 'public' | 'stewards'
  sourceApp?: string
  embedContext?: unknown
  pinned?: boolean
  sortRank?: number
  createdAt: string
  removed: boolean
  removedAt?: string
  removedBy?: string
  latestAction?: CommunitySharedContentActionView
  hydrationState?: 'ready' | 'unresolved' | 'deleted'
}

export type CommunitySharedContentActionView = {
  uri: string
  cid: string
  sharedContent: SharedContentSubject
  communityUri: string
  action: 'remove' | 'restore' | 'pin' | 'unpin'
  note?: string
  createdAt: string
  createdBy: string
}

export type CommunityRelationView = {
  uri: string
  cid: string
  parentCommunityUri: string
  childCommunityUri: string
  relation: 'parentChild'
  createdAt: string
  createdBy: string
}

export type CommunitySharedContentQueryOptions = {
  communityUri: string
  contentType?: SharedContentType
  includeRemoved?: boolean
  includeChildren?: boolean
  limit?: number
  cursor?: string
}

export type CommunityRelationsQueryOptions = {
  communityUri?: string
  parentCommunityUri?: string
  childCommunityUri?: string
  relation?: 'parentChild'
  limit?: number
  cursor?: string
}

export type ShareContentToCommunityInput = {
  subject: SharedContentSubject
  communityUri: string
  contentType: SharedContentType
  note?: string
  visibility?: 'community' | 'public' | 'stewards'
  sourceApp?: string
  embedContext?: unknown
  pinned?: boolean
  sortRank?: number
}

export type ModerateSharedContentInput = {
  sharedContent: SharedContentSubject
  communityUri: string
  note?: string
}

export const communitySharedContentQueryKey = (
  opts: CommunitySharedContentQueryOptions,
) => [
  RQKEY_ROOT,
  'list',
  opts.communityUri,
  opts.contentType ?? '',
  opts.includeRemoved ? 'removed' : 'visible',
  opts.includeChildren ? 'children' : 'direct',
  opts.limit ?? 50,
  opts.cursor ?? '',
]

export const communityRelationsQueryKey = (
  opts: CommunityRelationsQueryOptions,
) => [
  RQKEY_ROOT,
  'relations',
  opts.communityUri ?? '',
  opts.parentCommunityUri ?? '',
  opts.childCommunityUri ?? '',
  opts.relation ?? '',
  opts.limit ?? 50,
  opts.cursor ?? '',
]

export function useCommunitySharedContentQuery(
  opts: CommunitySharedContentQueryOptions,
) {
  const agent = useAgent()
  const options = {limit: 50, ...opts}

  return useQuery({
    staleTime: STALE.SECONDS.THIRTY,
    enabled: Boolean(options.communityUri),
    queryKey: communitySharedContentQueryKey(options),
    queryFn: async () => {
      const res = await agent.call('com.para.community.listSharedContent', {
        communityUri: options.communityUri,
        contentType: options.contentType,
        includeRemoved: options.includeRemoved,
        includeChildren: options.includeChildren,
        limit: options.limit,
        cursor: options.cursor,
      })
      return normalizeSharedContentResponse(res.data)
    },
  })
}

export function useCommunityRelationsQuery(
  opts: CommunityRelationsQueryOptions,
) {
  const agent = useAgent()
  const options = {limit: 50, relation: 'parentChild' as const, ...opts}

  return useQuery({
    staleTime: STALE.SECONDS.THIRTY,
    enabled: Boolean(
      options.communityUri ||
        options.parentCommunityUri ||
        options.childCommunityUri,
    ),
    queryKey: communityRelationsQueryKey(options),
    queryFn: async () => {
      const res = await agent.call(
        'com.para.community.listCommunityRelations',
        {
          communityUri: options.communityUri,
          parentCommunityUri: options.parentCommunityUri,
          childCommunityUri: options.childCommunityUri,
          relation: options.relation,
          limit: options.limit,
          cursor: options.cursor,
        },
      )
      return normalizeRelationsResponse(res.data)
    },
  })
}

export function useShareContentToCommunityMutation() {
  const agent = useAgent()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: ShareContentToCommunityInput) => {
      const res = await agent.call(
        'com.para.community.shareContent',
        undefined,
        input,
      )
      return normalizeShareContentResponse(res.data)
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({queryKey: [RQKEY_ROOT]})
      void queryClient.invalidateQueries({
        queryKey: [COMMUNITY_BOARDS_RQKEY_ROOT],
      })
      void queryClient.invalidateQueries({
        queryKey: [RQKEY_ROOT, 'list', variables.communityUri],
      })
    },
  })
}

export function useRemoveSharedContentMutation() {
  const agent = useAgent()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: ModerateSharedContentInput) => {
      const res = await agent.call(
        'com.para.community.removeSharedContent',
        undefined,
        input,
      )
      return normalizeSharedContentActionResponse(res.data)
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({queryKey: [RQKEY_ROOT]})
      void queryClient.invalidateQueries({
        queryKey: [RQKEY_ROOT, 'list', variables.communityUri],
      })
    },
  })
}

export function useRestoreSharedContentMutation() {
  const agent = useAgent()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: ModerateSharedContentInput) => {
      const res = await agent.call(
        'com.para.community.restoreSharedContent',
        undefined,
        input,
      )
      return normalizeSharedContentActionResponse(res.data)
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({queryKey: [RQKEY_ROOT]})
      void queryClient.invalidateQueries({
        queryKey: [RQKEY_ROOT, 'list', variables.communityUri],
      })
    },
  })
}

function normalizeSharedContentResponse(json: unknown): {
  items: CommunitySharedContentView[]
  cursor?: string
} {
  const data = asRecord(json) ?? {}
  const items = Array.isArray(data.items) ? data.items : []
  return {
    items: items.map(normalizeSharedContentView),
    cursor: readString(data.cursor),
  }
}

function normalizeRelationsResponse(json: unknown): {
  relations: CommunityRelationView[]
  cursor?: string
} {
  const data = asRecord(json) ?? {}
  const relations = Array.isArray(data.relations) ? data.relations : []
  return {
    relations: relations.map(normalizeRelationView),
    cursor: readString(data.cursor),
  }
}

function normalizeShareContentResponse(json: unknown): {
  uri: string
  cid: string
  sharedContent: CommunitySharedContentView
} {
  const data = asRecord(json) ?? {}
  return {
    uri: readString(data.uri) ?? '',
    cid: readString(data.cid) ?? '',
    sharedContent: normalizeSharedContentView(data.sharedContent),
  }
}

function normalizeSharedContentActionResponse(json: unknown): {
  uri: string
  cid: string
  action: CommunitySharedContentActionView
} {
  const data = asRecord(json) ?? {}
  return {
    uri: readString(data.uri) ?? '',
    cid: readString(data.cid) ?? '',
    action: normalizeActionView(data.action),
  }
}

function normalizeSharedContentView(json: unknown): CommunitySharedContentView {
  const data = asRecord(json) ?? {}
  return {
    uri: readString(data.uri) ?? '',
    cid: readString(data.cid) ?? '',
    subject: normalizeSubject(data.subject),
    communityUri: readString(data.communityUri) ?? '',
    sourceCommunityUri: readString(data.sourceCommunityUri),
    contentType: normalizeContentType(data.contentType),
    sharedBy: readString(data.sharedBy) ?? '',
    sharedByHandle: readString(data.sharedByHandle),
    note: readString(data.note),
    visibility: normalizeVisibility(data.visibility),
    sourceApp: readString(data.sourceApp),
    embedContext: data.embedContext,
    pinned: typeof data.pinned === 'boolean' ? data.pinned : undefined,
    sortRank: normalizeOptionalNumber(data.sortRank),
    createdAt: readString(data.createdAt) ?? '',
    removed: Boolean(data.removed),
    removedAt: readString(data.removedAt),
    removedBy: readString(data.removedBy),
    latestAction: data.latestAction
      ? normalizeActionView(data.latestAction)
      : undefined,
    hydrationState: normalizeHydrationState(data.hydrationState),
  }
}

function normalizeActionView(json: unknown): CommunitySharedContentActionView {
  const data = asRecord(json) ?? {}
  return {
    uri: readString(data.uri) ?? '',
    cid: readString(data.cid) ?? '',
    sharedContent: normalizeSubject(data.sharedContent),
    communityUri: readString(data.communityUri) ?? '',
    action: normalizeAction(data.action),
    note: readString(data.note),
    createdAt: readString(data.createdAt) ?? '',
    createdBy: readString(data.createdBy) ?? '',
  }
}

export function normalizeRelationView(json: unknown): CommunityRelationView {
  const data = asRecord(json) ?? {}
  return {
    uri: readString(data.uri) ?? '',
    cid: readString(data.cid) ?? '',
    parentCommunityUri: readString(data.parentCommunityUri) ?? '',
    childCommunityUri: readString(data.childCommunityUri) ?? '',
    relation: 'parentChild',
    createdAt: readString(data.createdAt) ?? '',
    createdBy: readString(data.createdBy) ?? '',
  }
}

function normalizeSubject(value: unknown): SharedContentSubject {
  const data = asRecord(value) ?? {}
  return {
    uri: readString(data.uri) ?? '',
    cid: readString(data.cid) ?? '',
  }
}

function normalizeContentType(value: unknown): SharedContentType {
  switch (value) {
    case 'post':
    case 'cabildeo':
    case 'collection':
    case 'mapInitiative':
    case 'external':
      return value
    default:
      return 'external'
  }
}

function normalizeVisibility(
  value: unknown,
): CommunitySharedContentView['visibility'] {
  switch (value) {
    case 'community':
    case 'public':
    case 'stewards':
      return value
    default:
      return undefined
  }
}

function normalizeAction(
  value: unknown,
): CommunitySharedContentActionView['action'] {
  switch (value) {
    case 'remove':
    case 'restore':
    case 'pin':
    case 'unpin':
      return value
    default:
      return 'remove'
  }
}

function normalizeHydrationState(
  value: unknown,
): CommunitySharedContentView['hydrationState'] {
  switch (value) {
    case 'ready':
    case 'unresolved':
    case 'deleted':
      return value
    default:
      return undefined
  }
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return undefined
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function normalizeOptionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (value === undefined || value === null) {
    return undefined
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}
