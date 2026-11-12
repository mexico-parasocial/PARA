import {type AtUriString} from '@atproto/syntax'
import {t} from '@lingui/core/macro'
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import {
  communityAct,
  communityDid,
  communitySlug,
} from '#/lib/api/community-act'
import {readUploadBlob} from '#/lib/api/upload-blob'
import {compressIfNeeded} from '#/lib/media/manip'
import {type PickerImage} from '#/lib/media/picker.shared'
import {STALE} from '#/state/queries'
import {useAgent, useSession} from '#/state/session'
import {com} from '#/lexicons'

const RQKEY_ROOT = 'community-boards'

export type CommunityBoardView = {
  uri: string
  cid: string
  creatorDid: string
  creatorHandle?: string
  creatorDisplayName?: string
  communityId: string
  slug: string
  name: string
  description?: string
  /** Cover image URL for the profile header; absent until the AppView serves one. */
  banner?: string
  quadrant: string
  /** Mexican state the community belongs to; empty when it has none. */
  region?: string
  delegatesChatId: string
  subdelegatesChatId: string
  memberCount: number
  viewerMembershipState:
    'none' | 'pending' | 'active' | 'left' | 'removed' | 'blocked'
  viewerRoles?: string[]
  status?: 'draft' | 'active'
  visibility?: 'open' | 'closed' | 'secret'
  chamberMode?: 'unicameral' | 'bicameral'
  founderStarterPackUri?: string
  parentCommunityUris?: string[]
  childCommunityCount?: number
  sharedContentCount?: number
  createdAt: string
  governanceSummary?: {
    moderatorCount: number
    officialCount: number
    deputyRoleCount: number
    lastPublishedAt?: string
  }
}

export type CommunityBoardsResponse = {
  boards: CommunityBoardView[]
  canCreateCommunity: boolean
  cursor?: string
}

export type CommunityBoardResponse = {
  board: CommunityBoardView
  viewerCapabilities: string[]
}

type CreateCommunityInput = {
  name: string
  quadrant: string
  region?: string
  description?: string
}

type CreateCommunityResponse = {
  /** The community's profile record: how the community is named everywhere. */
  uri: string
  cid: string
  did: string
  handle: string
}

export type CommunityMemberView = {
  did: string
  handle?: string
  displayName?: string
  avatar?: string
  membershipState: string
  roles?: string[]
  chamberAssignment?: 'A' | 'B'
  joinedAt: string
  votesCast: number
  delegationsReceived: number
  policyPosts: number
  matterPosts: number
}

export type CommunityMembersResponse = {
  members: CommunityMemberView[]
  cursor?: string
}

export type CommunityBoardsQueryOptions = {
  limit?: number
  query?: string
  state?: string
  quadrant?: string
  /** Mexican state, as stored in a community's `region`. */
  region?: string
  participationKind?: 'matter' | 'policy'
  flairId?: string
  sort?: 'recent' | 'activity' | 'size'
  cursor?: string
}

export type CommunityMembersQueryOptions = {
  communityId?: string
  membershipState?: string
  role?: string
  sort?: 'joined' | 'participation'
  limit?: number
  cursor?: string
}

export const communityBoardsQueryKey = (
  opts: CommunityBoardsQueryOptions,
  viewerDid?: string,
) => [
  RQKEY_ROOT,
  'list',
  opts.limit ?? 12,
  opts.query ?? '',
  opts.state ?? '',
  opts.quadrant ?? '',
  opts.region ?? '',
  opts.participationKind ?? '',
  opts.flairId ?? '',
  opts.sort ?? '',
  opts.cursor ?? '',
  viewerDid,
]

export const communityMembersQueryKey = (
  opts: CommunityMembersQueryOptions,
) => [
  RQKEY_ROOT,
  'members',
  opts.communityId ?? '',
  opts.membershipState ?? '',
  opts.role ?? '',
  opts.sort ?? '',
  opts.limit ?? 50,
  opts.cursor ?? '',
]

export const communityBoardQueryKey = ({
  communityId,
  uri,
  viewerDid,
}: {
  communityId?: string
  uri?: string
  viewerDid?: string
}) => [RQKEY_ROOT, 'detail', communityId || '', uri || '', viewerDid]

export function useCommunityBoardsQuery(
  opts: CommunityBoardsQueryOptions = {},
  enabled = true,
) {
  const agent = useAgent()
  const options = {limit: 12, ...opts}

  return useQuery<CommunityBoardsResponse>({
    staleTime: STALE.SECONDS.THIRTY,
    enabled,
    queryKey: communityBoardsQueryKey(options, agent.session?.did),
    queryFn: async () => fetchCommunityBoards({agent, opts: options}),
  })
}

// Tree browsing includes public boards, not just the viewer's memberships.
export function useCommunityTreeDirectoryQuery() {
  const agent = useAgent()
  const {currentAccount} = useSession()
  return useInfiniteQuery({
    queryKey: [RQKEY_ROOT, 'tree-directory', currentAccount?.did],
    staleTime: STALE.SECONDS.THIRTY,
    initialPageParam: undefined as string | undefined,
    queryFn: ({pageParam}) =>
      fetchCommunityBoards({agent, opts: {limit: 100, cursor: pageParam}}),
    getNextPageParam: page => page.cursor || undefined,
  })
}

export function useCommunityBoardQuery({
  communityId,
  uri,
  enabled = true,
}: {
  communityId?: string
  uri?: string
  enabled?: boolean
}) {
  const agent = useAgent()

  return useQuery<CommunityBoardResponse>({
    staleTime: STALE.SECONDS.THIRTY,
    enabled: enabled && Boolean(communityId || uri),
    queryKey: communityBoardQueryKey({
      communityId,
      uri,
      viewerDid: agent.session?.did,
    }),
    queryFn: async () => fetchCommunityBoard({agent, communityId, uri}),
  })
}

export function useCommunityMembersQuery(opts: CommunityMembersQueryOptions) {
  const agent = useAgent()
  const options = {limit: 50, membershipState: 'active', ...opts}

  return useQuery<CommunityMembersResponse>({
    staleTime: STALE.SECONDS.THIRTY,
    enabled: Boolean(options.communityId),
    queryKey: communityMembersQueryKey(options),
    queryFn: async () => fetchCommunityMembers({agent, opts: options}),
  })
}

export function useCreateCommunityMutation() {
  const agent = useAgent()
  const queryClient = useQueryClient()

  return useMutation<CreateCommunityResponse, Error, CreateCommunityInput>({
    mutationFn: async input => createCommunity({agent, input}),
    onSuccess: () => {
      void queryClient.invalidateQueries({queryKey: [RQKEY_ROOT]})
    },
  })
}

/** The host accepts PNG or JPEG banners up to this size. */
const BANNER_MAX_BYTES = 1_000_000

/**
 * Sets a community's banner: stores the image in the community's own repo,
 * then names it in a profile update. Only an owner may.
 */
export function useSetCommunityBannerMutation() {
  const agent = useAgent()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      board,
      image,
    }: {
      board: CommunityBoardView
      image: PickerImage
    }) => {
      const community = communityDid(board.uri)
      const compressed = await compressIfNeeded(image, BANNER_MAX_BYTES)
      const {mime} = compressed
      if (mime !== 'image/png' && mime !== 'image/jpeg') {
        throw new Error(t`Choose a PNG or JPEG image for the banner.`)
      }
      const body = await readUploadBlob(compressed.path)
      const uploaded = await agent.pdsClient.xrpc(
        com.para.community.uploadBanner,
        {params: {community}, body, encoding: mime},
      )
      // A profile update replaces every field. Read the latest values from
      // the host because the AppView may still be indexing an earlier edit.
      const current = await agent.pdsClient.call(com.atproto.repo.getRecord, {
        repo: community,
        collection: com.para.community.profile.$type,
        rkey: 'self',
      })
      const {name, description, quadrant, region} =
        com.para.community.profile.$parse(current.value)
      return communityAct(agent, board.uri, {
        action: 'profile.update',
        profile: {
          name,
          description,
          quadrant,
          region,
          banner: uploaded.body.cid,
        },
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({queryKey: [RQKEY_ROOT]})
      // The AppView indexes the new profile a moment after the write.
      setTimeout(
        () => void queryClient.invalidateQueries({queryKey: [RQKEY_ROOT]}),
        2500,
      )
    },
  })
}

type JoinCommunityInput = {
  communityUri: string
  source?: string
}

type JoinCommunityResponse = {
  communityUri: string
  membershipState: CommunityBoardView['viewerMembershipState']
}

type LeaveCommunityInput = {
  communityUri: string
}

type LeaveCommunityResponse = JoinCommunityResponse

export function useJoinCommunityMutation() {
  const agent = useAgent()
  const queryClient = useQueryClient()

  return useMutation<JoinCommunityResponse, Error, JoinCommunityInput>({
    mutationFn: async input => joinCommunity({agent, input}),
    onSuccess: () => {
      void queryClient.invalidateQueries({queryKey: [RQKEY_ROOT]})
    },
  })
}

export function useLeaveCommunityMutation() {
  const agent = useAgent()
  const queryClient = useQueryClient()

  return useMutation<LeaveCommunityResponse, Error, LeaveCommunityInput>({
    mutationFn: async input => leaveCommunity({agent, input}),
    onSuccess: () => {
      void queryClient.invalidateQueries({queryKey: [RQKEY_ROOT]})
    },
  })
}

export async function fetchCommunityBoards({
  agent,
  opts,
}: {
  agent: ReturnType<typeof useAgent>
  opts: CommunityBoardsQueryOptions
}): Promise<CommunityBoardsResponse> {
  const res = await agent.appviewClient.call(com.para.community.listBoards, {
    limit: opts.limit ?? 12,
    query: opts.query,
    state: opts.state,
    quadrant: opts.quadrant,
    region: opts.region,
    participationKind: opts.participationKind,
    flairId: opts.flairId,
    sort: opts.sort,
    cursor: opts.cursor,
  })

  return normalizeCommunityBoardsResponse(res)
}

async function fetchCommunityMembers({
  agent,
  opts,
}: {
  agent: ReturnType<typeof useAgent>
  opts: CommunityMembersQueryOptions
}): Promise<CommunityMembersResponse> {
  const res = await agent.appviewClient.call(com.para.community.listMembers, {
    communityId: opts.communityId ?? '',
    limit: opts.limit ?? 50,
    membershipState: opts.membershipState,
    role: opts.role,
    sort: opts.sort,
    cursor: opts.cursor,
  })

  return normalizeCommunityMembersResponse(res)
}

export async function fetchCommunityBoard({
  agent,
  communityId,
  uri,
}: {
  agent: ReturnType<typeof useAgent>
  communityId?: string
  uri?: string
}): Promise<CommunityBoardResponse> {
  const res = await agent.appviewClient.call(com.para.community.getBoard, {
    communityId,
    uri: uri as AtUriString | undefined,
  })

  return normalizeCommunityBoardResponse(res)
}

async function createCommunity({
  agent,
  input,
}: {
  agent: ReturnType<typeof useAgent>
  input: CreateCommunityInput
}): Promise<CreateCommunityResponse> {
  const slug = communitySlug(input.name)
  if (!slug) {
    throw new Error('Elige un nombre con al menos tres letras o números.')
  }
  // The PDS creates the community's own account and its first event.
  const res = await agent.pdsClient.call(com.para.community.create, {
    name: input.name,
    slug,
    quadrant: input.quadrant,
    region: input.region,
    description: input.description,
  })
  return {uri: res.uri, cid: res.cid, did: res.did, handle: res.handle}
}

function normalizeCommunityBoardsResponse(
  json: unknown,
): CommunityBoardsResponse {
  const data = asRecord(json) ?? {}
  const boards = Array.isArray(data.boards) ? data.boards : []

  return {
    boards: boards.map(normalizeBoard),
    canCreateCommunity: data.canCreateCommunity !== false,
    cursor: readString(data.cursor),
  }
}

function normalizeCommunityMembersResponse(
  json: unknown,
): CommunityMembersResponse {
  const data = asRecord(json) ?? {}
  const members = Array.isArray(data.members) ? data.members : []

  return {
    members: members.map(normalizeMember),
    cursor: readString(data.cursor),
  }
}

function normalizeCommunityBoardResponse(
  json: unknown,
): CommunityBoardResponse {
  const data = asRecord(json) ?? {}
  return {
    board: normalizeBoard(data.board),
    viewerCapabilities: Array.isArray(data.viewerCapabilities)
      ? data.viewerCapabilities.filter(
          capability => typeof capability === 'string',
        )
      : [],
  }
}

function normalizeMember(json: unknown): CommunityMemberView {
  const data = asRecord(json) ?? {}
  return {
    did: readString(data.did) ?? '',
    handle: readString(data.handle),
    displayName: readString(data.displayName),
    avatar: readString(data.avatar),
    membershipState: readString(data.membershipState) ?? 'active',
    roles: Array.isArray(data.roles)
      ? data.roles.filter(role => typeof role === 'string')
      : undefined,
    chamberAssignment: readString(data.chamberAssignment) as
      'A' | 'B' | undefined,
    joinedAt: readString(data.joinedAt) ?? '',
    votesCast: normalizeNumber(data.votesCast),
    delegationsReceived: normalizeNumber(data.delegationsReceived),
    policyPosts: normalizeNumber(data.policyPosts),
    matterPosts: normalizeNumber(data.matterPosts),
  }
}

function normalizeBoard(json: unknown): CommunityBoardView {
  const data = asRecord(json) ?? {}
  const governanceSummary = asRecord(data.governanceSummary)

  return {
    uri: readString(data.uri) ?? '',
    cid: readString(data.cid) ?? '',
    creatorDid: readString(data.creatorDid) ?? '',
    creatorHandle: readString(data.creatorHandle),
    creatorDisplayName: readString(data.creatorDisplayName),
    communityId: readString(data.communityId) ?? '',
    slug: readString(data.slug) ?? '',
    name: readString(data.name) ?? '',
    description: readString(data.description),
    banner: readString(data.banner),
    quadrant: readString(data.quadrant) ?? '',
    region: readString(data.region),
    delegatesChatId: readString(data.delegatesChatId) ?? '',
    subdelegatesChatId: readString(data.subdelegatesChatId) ?? '',
    memberCount:
      typeof data.memberCount === 'number'
        ? data.memberCount
        : Number(readString(data.memberCount) ?? 0),
    viewerMembershipState: normalizeMembershipState(data.viewerMembershipState),
    viewerRoles: Array.isArray(data.viewerRoles)
      ? data.viewerRoles.filter(role => typeof role === 'string')
      : undefined,
    status: normalizeStatus(data.status),
    visibility: normalizeVisibility(data.visibility),
    chamberMode: normalizeChamberMode(data.chamberMode),
    founderStarterPackUri: readString(data.founderStarterPackUri),
    parentCommunityUris: Array.isArray(data.parentCommunityUris)
      ? data.parentCommunityUris.filter(uri => typeof uri === 'string')
      : undefined,
    childCommunityCount:
      data.childCommunityCount === undefined
        ? undefined
        : normalizeNumber(data.childCommunityCount),
    sharedContentCount:
      data.sharedContentCount === undefined
        ? undefined
        : normalizeNumber(data.sharedContentCount),
    createdAt: readString(data.createdAt) ?? '',
    governanceSummary: governanceSummary
      ? {
          moderatorCount: normalizeNumber(governanceSummary.moderatorCount),
          officialCount: normalizeNumber(governanceSummary.officialCount),
          deputyRoleCount: normalizeNumber(governanceSummary.deputyRoleCount),
          lastPublishedAt: readString(governanceSummary.lastPublishedAt),
        }
      : undefined,
  }
}

function normalizeVisibility(value: unknown): CommunityBoardView['visibility'] {
  switch (value) {
    case 'open':
    case 'closed':
    case 'secret':
      return value
    default:
      return 'open'
  }
}

function normalizeChamberMode(
  value: unknown,
): CommunityBoardView['chamberMode'] {
  switch (value) {
    case 'unicameral':
    case 'bicameral':
      return value
    default:
      return 'unicameral'
  }
}

function normalizeMembershipState(
  value: unknown,
): CommunityBoardView['viewerMembershipState'] {
  switch (value) {
    case 'pending':
    case 'active':
    case 'left':
    case 'removed':
    case 'blocked':
      return value
    default:
      return 'none'
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

function normalizeNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  const parsed = Number(readString(value) ?? value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeStatus(value: unknown): CommunityBoardView['status'] {
  switch (value) {
    case 'draft':
    case 'active':
      return value
    default:
      return undefined
  }
}

async function joinCommunity({
  agent,
  input,
}: {
  agent: ReturnType<typeof useAgent>
  input: JoinCommunityInput
}): Promise<JoinCommunityResponse> {
  await communityAct(agent, input.communityUri, {action: 'member.join'})
  return {communityUri: input.communityUri, membershipState: 'active'}
}

async function leaveCommunity({
  agent,
  input,
}: {
  agent: ReturnType<typeof useAgent>
  input: LeaveCommunityInput
}): Promise<LeaveCommunityResponse> {
  await communityAct(agent, input.communityUri, {action: 'member.leave'})
  return {communityUri: input.communityUri, membershipState: 'left'}
}
