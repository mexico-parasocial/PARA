import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'

import {matrixBridgeFetch} from '#/lib/matrix/bridge'
import {logger} from '#/logger'

interface CommunitySpaceResponse {
  spaceId: string
  slug: string
}

interface MatrixTokenResponse {
  accessToken: string
  deviceId: string
  userId: string
  homeServer: string
}

interface UnreadResponse {
  unread: number
  communities: MatrixRoomSummary[]
}

export type MatrixRoomKind = 'main' | 'chamber-a' | 'chamber-b' | 'observers'

export interface MatrixRoomSummary {
  roomId: string
  communityUri: string
  slug: string
  unread: number
  kind: MatrixRoomKind
}

async function getBridgeErrorMessage(
  res: Response,
  fallback: string,
): Promise<string> {
  const err = (await res.json().catch(() => ({}))) as {error?: string}
  return err.error || `${fallback}: ${res.status}`
}

export type SortitionEligibilityFilter = 'all' | 'verified' | 'senior'

export type SortitionRun = {
  id: string
  cabildeoUri: string
  communityUri: string
  createdByDid: string
  assemblySize: number
  eligibilityFilter: SortitionEligibilityFilter
  drandRound: number
  drandRandomness: string | null
  threshold: number | null
  eligibleCount: number
  selectedCount: number
  status: 'scheduled' | 'active' | 'failed'
  configRecord: Record<string, unknown> | null
  createdAt: string
  processedAt: string | null
}

export type SortitionCandidate = {
  runId: string
  did: string
  communityUri: string
  cabildeoUri: string
  hashInput: string
  hashOutput: string
  hashValue: number
  threshold: number
  selected: boolean
  createdAt: string
}

type SortitionRunResponse = {
  run: SortitionRun
  selected: SortitionCandidate[]
  viewerCandidate: SortitionCandidate | null
}

export function useCommunitySpaceQuery(communityUri: string | undefined) {
  return useQuery<CommunitySpaceResponse>({
    queryKey: ['matrix-space', communityUri],
    queryFn: async () => {
      if (!communityUri) throw new Error('No community URI')
      const res = await matrixBridgeFetch(
        `/api/space-for-community?uri=${encodeURIComponent(communityUri)}`,
      )
      if (!res.ok) {
        throw new Error(await getBridgeErrorMessage(res, 'Failed to fetch space'))
      }
      return res.json()
    },
    enabled: !!communityUri,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useMatrixTokenQuery({enabled = true}: {enabled?: boolean} = {}) {
  return useQuery<MatrixTokenResponse>({
    queryKey: ['matrix-token'],
    queryFn: async () => {
      const res = await matrixBridgeFetch('/api/matrix-token', {
        method: 'POST',
      })
      if (!res.ok) {
        throw new Error(await getBridgeErrorMessage(res, 'Failed to fetch token'))
      }
      return res.json()
    },
    enabled,
    staleTime: 1000 * 60 * 60, // 1 hour — tokens are long-lived in Synapse
  })
}

export function useUnreadCountQuery({enabled = true}: {enabled?: boolean} = {}) {
  return useQuery<UnreadResponse>({
    queryKey: ['matrix-unread'],
    queryFn: async () => {
      // Background poller: the bridge being down is routine (local dev runs
      // without it), so degrade to a zero count instead of surfacing an error.
      try {
        const res = await matrixBridgeFetch('/api/unread')
        if (!res.ok) {
          throw new Error(
            await getBridgeErrorMessage(res, 'Failed to fetch unread'),
          )
        }
        return res.json()
      } catch (err) {
        logger.warn('matrix: bridge unavailable, defaulting unread to 0', {
          safeMessage: `${err}`,
        })
        return {unread: 0, communities: []}
      }
    },
    enabled,
    refetchInterval: 1000 * 60 * 2, // Poll every 2 minutes
  })
}

export function useMatrixRoomsQuery({
  enabled = true,
}: {enabled?: boolean} = {}) {
  return useQuery<{rooms: MatrixRoomSummary[]}>({
    queryKey: ['matrix-rooms'],
    queryFn: async () => {
      const res = await matrixBridgeFetch('/api/rooms')
      if (!res.ok) {
        throw new Error(await getBridgeErrorMessage(res, 'Failed to fetch rooms'))
      }
      return res.json()
    },
    enabled,
    staleTime: 1000 * 60,
  })
}

interface MarkReadInput {
  roomId: string
  eventId?: string
}

export function useMarkMatrixReadMutation() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, MarkReadInput>({
    mutationFn: async ({roomId, eventId}) => {
      const res = await matrixBridgeFetch('/api/mark-read', {
        method: 'POST',
        body: JSON.stringify({roomId, eventId}),
      })
      if (!res.ok) {
        throw new Error(await getBridgeErrorMessage(res, 'Failed to mark read'))
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({queryKey: ['matrix-unread']})
      void queryClient.invalidateQueries({queryKey: ['matrix-rooms']})
    },
  })
}

interface RegisterPushTokenInput {
  expoPushToken: string
  platform: string
}

export function useRegisterMatrixPushTokenMutation() {
  return useMutation<void, Error, RegisterPushTokenInput>({
    mutationFn: async ({expoPushToken, platform}) => {
      const res = await matrixBridgeFetch('/api/push-token', {
        method: 'POST',
        body: JSON.stringify({expoPushToken, platform}),
      })
      if (!res.ok) {
        throw new Error(
          await getBridgeErrorMessage(res, 'Failed to register push token'),
        )
      }
    },
  })
}

// ─── Constitution as Code: Proposals & Decisions ───

export function useCommunityProposalsQuery(
  communityUri: string | undefined,
  state?: string,
) {
  return useQuery({
    queryKey: ['proposals', communityUri, state],
    queryFn: async () => {
      if (!communityUri) throw new Error('No community URI')
      const params = new URLSearchParams({community: communityUri})
      if (state) params.set('state', state)
      const res = await matrixBridgeFetch(`/api/proposals?${params.toString()}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Failed to fetch proposals: ${res.status}`)
      }
      return res.json() as Promise<{proposals: unknown[]}>
    },
    enabled: !!communityUri,
    staleTime: 1000 * 30,
  })
}

export function useCommunityDecisionsQuery(communityUri: string | undefined) {
  return useQuery({
    queryKey: ['decisions', communityUri],
    queryFn: async () => {
      if (!communityUri) throw new Error('No community URI')
      const res = await matrixBridgeFetch(
        `/api/decisions?community=${encodeURIComponent(communityUri)}`,
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Failed to fetch decisions: ${res.status}`)
      }
      return res.json() as Promise<{decisions: unknown[]}>
    },
    enabled: !!communityUri,
    staleTime: 1000 * 60,
  })
}

export function useSortitionProofQuery(
  did: string | undefined,
  communityUri: string | undefined,
) {
  return useQuery({
    queryKey: ['sortition-proof', did, communityUri],
    queryFn: async () => {
      if (!did || !communityUri) throw new Error('Missing did or communityUri')
      const res = await matrixBridgeFetch(
        `/api/sortition-proof?did=${encodeURIComponent(did)}&community=${encodeURIComponent(communityUri)}`,
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Failed to fetch proof: ${res.status}`)
      }
      return res.json() as Promise<{
        did: string
        communityUri: string
        chamber: string
        drandRound: number
        drandRandomness: string
        hashInput: string
        hashOutput: string
        timestamp: string
        verified: boolean
      }>
    },
    enabled: !!did && !!communityUri,
    staleTime: 1000 * 60 * 60, // proofs never change
  })
}

export function useSortitionRunQuery(
  cabildeoUri: string | undefined,
  viewerDid?: string,
) {
  return useQuery({
    queryKey: ['sortition-run', cabildeoUri, viewerDid],
    queryFn: async () => {
      if (!cabildeoUri) throw new Error('No Cabildeo URI')
      const params = new URLSearchParams({cabildeo: cabildeoUri})
      if (viewerDid) params.set('viewerDid', viewerDid)
      const res = await matrixBridgeFetch(`/api/sortition/runs?${params.toString()}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Failed to fetch sortition run: ${res.status}`)
      }
      return res.json() as Promise<SortitionRunResponse>
    },
    enabled: !!cabildeoUri,
    refetchInterval: 10_000,
    retry: false,
  })
}

export function useCreateSortitionRunMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      cabildeoUri: string
      communityUri: string
      createdByDid: string
      assemblySize: number
      eligibilityFilter: SortitionEligibilityFilter
      roundOffset: number
    }) => {
      const res = await matrixBridgeFetch('/api/sortition/runs', {
        method: 'POST',
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Failed to create sortition run: ${res.status}`)
      }
      return res.json() as Promise<{run: SortitionRun}>
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['sortition-run', variables.cabildeoUri],
      })
    },
  })
}

export function useCommunityConstitutionQuery(
  communityUri: string | undefined,
) {
  return useQuery({
    queryKey: ['constitution', communityUri],
    queryFn: async () => {
      if (!communityUri) throw new Error('No community URI')
      const res = await matrixBridgeFetch(
        `/api/constitution?uri=${encodeURIComponent(communityUri)}`,
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(
          err.error || `Failed to fetch constitution: ${res.status}`,
        )
      }
      return res.json() as Promise<{
        communityUri: string
        version: number
        rules: unknown
        createdAt: string
      }>
    },
    enabled: !!communityUri,
    staleTime: 1000 * 60 * 5,
  })
}

// ─── Chat Moderation Badges ───

export interface ChatBadge {
  type: string
  label: string
  icon: string
  severity: 'info' | 'warning' | 'critical'
  visibleInChat: boolean
  since?: string
  expiresAt?: string | null
}

interface ParticipationSummary {
  did: string
  communityUri: string
  tier: string
  messageCount: number
  votesCast: number
  proposalsCreated: number
  daysInCommunity: number
  chamber?: string | null
  isDelegate: boolean
  isModerator: boolean
}

interface ChatBadgesResponse {
  did: string
  communityUri: string
  visibleBadges: ChatBadge[]
  hiddenBadges: ChatBadge[]
  participation: ParticipationSummary | null
}

export function useChatBadgesQuery(
  did: string | undefined,
  communityUri: string | undefined,
) {
  return useQuery<ChatBadgesResponse>({
    queryKey: ['chat-badges', did, communityUri],
    queryFn: async () => {
      if (!did || !communityUri) throw new Error('Missing did or communityUri')
      const res = await matrixBridgeFetch(
        `/api/chat-badges?did=${encodeURIComponent(did)}&community=${encodeURIComponent(communityUri)}`,
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(
          err.error || `Failed to fetch chat badges: ${res.status}`,
        )
      }
      return res.json()
    },
    enabled: !!did && !!communityUri,
    staleTime: 1000 * 60 * 2,
  })
}

export interface MemberListItem {
  did: string
  matrixUserId?: string
  badges: ChatBadge[]
  participation: ParticipationSummary | null
  lastActiveAt?: string
}

interface ChatMemberListResponse {
  members: MemberListItem[]
  total: number
}

export function useChatMemberListQuery(
  communityUri: string | undefined,
  limit = 100,
  offset = 0,
) {
  return useQuery<ChatMemberListResponse>({
    queryKey: ['chat-member-list', communityUri, limit, offset],
    queryFn: async () => {
      if (!communityUri) throw new Error('No community URI')
      const params = new URLSearchParams({
        community: communityUri,
        limit: String(limit),
        offset: String(offset),
      })
      const res = await matrixBridgeFetch(`/api/chat-member-list?${params.toString()}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(
          err.error || `Failed to fetch member list: ${res.status}`,
        )
      }
      return res.json()
    },
    enabled: !!communityUri,
    staleTime: 1000 * 60,
  })
}

interface ModerationDashboardResponse {
  totalMembers: number
  activeToday: number
  reportedThisWeek: number
  sanctionedNow: number
  riskDistribution: {low: number; warning: number; critical: number}
  recentEvents: unknown[]
}

export function useModerationDashboardQuery(
  communityUri: string | undefined,
  modDid: string | undefined,
) {
  return useQuery<ModerationDashboardResponse>({
    queryKey: ['moderation-dashboard', communityUri, modDid],
    queryFn: async () => {
      if (!communityUri || !modDid)
        throw new Error('Missing communityUri or modDid')
      const params = new URLSearchParams({
        community: communityUri,
        modDid,
      })
      const res = await matrixBridgeFetch(`/api/moderation-dashboard?${params.toString()}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Failed to fetch dashboard: ${res.status}`)
      }
      return res.json()
    },
    enabled: !!communityUri && !!modDid,
    staleTime: 1000 * 60,
  })
}

interface ReportUserInput {
  reportedDid: string
  reporterDid: string
  communityUri: string
  reason: string
  context?: string
  matrixEventId?: string
  matrixRoomId?: string
}

export function useReportUserMutation() {
  return useMutation<void, Error, ReportUserInput>({
    mutationFn: async input => {
      const res = await matrixBridgeFetch('/api/moderation-report', {
        method: 'POST',
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Failed to submit report: ${res.status}`)
      }
    },
  })
}

interface ApplySanctionInput {
  targetDid: string
  sanctionedByDid: string
  communityUri: string
  type: 'mute' | 'ban' | 'redact'
  durationMinutes?: number
  reason?: string
  matrixRoomId?: string
}

export function useApplySanctionMutation() {
  return useMutation<void, Error, ApplySanctionInput>({
    mutationFn: async input => {
      const res = await matrixBridgeFetch('/api/moderation-sanction', {
        method: 'POST',
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Failed to apply sanction: ${res.status}`)
      }
    },
  })
}

// ─── User Chat Preferences ───

export function useUserChatPreferencesQuery(did: string | undefined) {
  return useQuery<{showChatBadges: boolean}>({
    queryKey: ['user-chat-preferences', did],
    queryFn: async () => {
      if (!did) throw new Error('No DID')
      const res = await matrixBridgeFetch(
        `/api/user-chat-preferences?did=${encodeURIComponent(did)}`,
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(
          err.error || `Failed to fetch preferences: ${res.status}`,
        )
      }
      return res.json()
    },
    enabled: !!did,
  })
}

interface UpdateChatPreferencesInput {
  did: string
  showChatBadges: boolean
}

export function useUpdateUserChatPreferencesMutation() {
  return useMutation<void, Error, UpdateChatPreferencesInput>({
    mutationFn: async ({did, showChatBadges}) => {
      const res = await matrixBridgeFetch('/api/user-chat-preferences', {
        method: 'POST',
        body: JSON.stringify({did, showChatBadges}),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(
          err.error || `Failed to update preferences: ${res.status}`,
        )
      }
    },
  })
}

// ─── Extract (link/URL metadata extraction) ───

interface ExtractInput {
  url: string
  communityUri?: string
}

interface ExtractResult {
  title: string | null
  description: string | null
  imageUrl: string | null
  favicon: string | null
  domain: string | null
}

export function useExtractMutation() {
  return useMutation<ExtractResult, Error, ExtractInput>({
    mutationFn: async input => {
      const res = await matrixBridgeFetch('/api/extract', {
        method: 'POST',
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Failed to extract: ${res.status}`)
      }
      return res.json()
    },
  })
}

// ─── Moderation Recompute ───

interface RecomputeInput {
  communityUri: string
}

interface RecomputeResult {
  recomputed: boolean
  membersUpdated: number
  timestamp: string
}

export function useModerationRecomputeMutation() {
  return useMutation<RecomputeResult, Error, RecomputeInput>({
    mutationFn: async input => {
      const res = await matrixBridgeFetch('/api/moderation-recompute', {
        method: 'POST',
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Failed to recompute: ${res.status}`)
      }
      return res.json()
    },
  })
}

// ─── Sortition Run Processing ───

interface ProcessSortitionInput {
  runId: string
}

export function useProcessSortitionRunMutation() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, ProcessSortitionInput>({
    mutationFn: async input => {
      const res = await matrixBridgeFetch('/api/sortition/runs/process', {
        method: 'POST',
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Failed to process sortition: ${res.status}`)
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({queryKey: ['sortition-run']})
    },
  })
}

// ─── Verify Sortition ───

interface VerifySortitionInput {
  runId: string
  did: string
}

interface VerifySortitionResult {
  verified: boolean
  selected: boolean
  chamber: string | null
  hashOutput: string
  proof: {
    drandRound: number
    drandRandomness: string
    hashInput: string
  }
}

export function useVerifySortitionMutation() {
  return useMutation<VerifySortitionResult, Error, VerifySortitionInput>({
    mutationFn: async input => {
      const res = await matrixBridgeFetch('/api/verify-sortition', {
        method: 'POST',
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Failed to verify sortition: ${res.status}`)
      }
      return res.json()
    },
  })
}
