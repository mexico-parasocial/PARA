import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'

import {
  BridgeResponseError,
  isBridgeAuthError,
  matrixBridgeFetch,
} from '#/lib/matrix/bridge'
import {
  BRIDGE_AUDIENCES,
  bridgeCallWithProof,
  MatrixProofUnavailableError,
} from '#/lib/matrix/proofs'
import {logger} from '#/logger'
import {useSession} from '#/state/session'

interface CommunitySpaceResponse {
  spaceId: string
  slug: string
}

interface MatrixTokenResponse {
  accessToken: string
  deviceId: string
  sessionId: string
  userId: string
  homeServer: string
}

export interface MatrixIdentityResponse {
  userId: string
  homeServer: string
  /** How this deployment expects a client to obtain a device session. */
  loginFlow: 'oidc'
}

export interface MatrixAttestResponse {
  userId: string
  sessionId: string
  deviceId: string
  attested: boolean
}

export interface CommunityJoinResponse {
  userId: string
  spaceId: string
  joinedRoomIds: string[]
  chamber: 'A' | 'B' | null
}

interface UnreadResponse {
  unread: number
  communities: MatrixRoomSummary[]
  /**
   * True when the count is a fallback because the bridge could not be reached,
   * not a real "nothing unread". Surfaces in the chat list; see
   * `useUnreadCountQuery`.
   */
  unavailable?: boolean
}

export type MatrixRoomKind = 'main' | 'chamber-a' | 'chamber-b' | 'observers'

export interface MatrixRoomSummary {
  roomId: string
  communityUri: string
  slug: string
  unread: number
  kind: MatrixRoomKind
}

async function getBridgeError(
  res: Response,
  fallback: string,
): Promise<BridgeResponseError> {
  const err = (await res.json().catch(() => ({}))) as {error?: string}
  return new BridgeResponseError(res.status, err.error || fallback)
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
  const {currentAccount} = useSession()
  return useQuery<CommunitySpaceResponse>({
    queryKey: ['matrix-space', communityUri, currentAccount?.did],
    queryFn: async () => {
      if (!communityUri) throw new Error('No community URI')
      const res = await matrixBridgeFetch(
        `/api/space-for-community?uri=${encodeURIComponent(communityUri)}`,
      )
      if (!res.ok) {
        throw await getBridgeError(res, 'Failed to fetch space')
      }
      return res.json()
    },
    enabled: !!communityUri && !!currentAccount,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * CD-M6: the caller's Matrix identity, derived from the identity key the
 * app just proved possession of. No mapping is read server-side; this is the
 * derivation cross-check plus the point where the Synapse account is
 * ensured. Mints nothing. (The old GET variant is gone — 410 server-side.)
 */
export function useMatrixIdentityQuery({
  enabled = true,
}: {enabled?: boolean} = {}) {
  const {currentAccount} = useSession()
  return useQuery<MatrixIdentityResponse>({
    queryKey: ['matrix-identity', currentAccount?.did],
    queryFn: () =>
      bridgeCallWithProof(BRIDGE_AUDIENCES.identity, '/api/matrix-identity'),
    enabled: enabled && !!currentAccount,
    staleTime: Infinity,
    retry: (failureCount, error) =>
      !(error instanceof MatrixProofUnavailableError) && failureCount < 2,
  })
}

/**
 * CD-M6 session attestation for MAS-native logins: registers the client's
 * MAS device against the derived MXID so attribution, moderation,
 * revocation and role projection reach it. Idempotent per device — call on
 * every login with the actual Matrix deviceId returned by the MAS client.
 */
export function useMatrixAttestMutation() {
  return useMutation<
    MatrixAttestResponse,
    Error,
    {deviceId: string; friendlyName?: string}
  >({
    mutationFn: ({deviceId, friendlyName}) =>
      bridgeCallWithProof(BRIDGE_AUDIENCES.attest, '/api/matrix-attest', {
        deviceId,
        friendlyName,
      }),
  })
}

/**
 * The verified join (CD-M6): re-join the caller's account into a
 * community's rooms after a proof of possession. Idempotent — call it on
 * membership.changed→active, on foreground, and whenever sync reports the
 * account left a room it should still be in (the bridge's membership lease
 * evicts inactive accounts; active members are re-admitted here).
 */
export function useCommunityJoinMutation() {
  const queryClient = useQueryClient()
  return useMutation<CommunityJoinResponse, Error, {communityUri: string}>({
    mutationFn: ({communityUri}) =>
      bridgeCallWithProof(BRIDGE_AUDIENCES.join, '/api/community-join', {
        communityUri,
      }),
    onSuccess: (_data, {communityUri}) => {
      void queryClient.invalidateQueries({queryKey: ['matrix-rooms']})
      void queryClient.invalidateQueries({queryKey: ['matrix-unread']})
      void queryClient.invalidateQueries({
        queryKey: ['matrix-space', communityUri],
      })
    },
  })
}

export function useMatrixTokenQuery({
  enabled = true,
  deviceId,
  friendlyName,
}: {
  enabled?: boolean
  deviceId?: string
  friendlyName?: string
} = {}) {
  const {currentAccount} = useSession()
  return useQuery<MatrixTokenResponse>({
    queryKey: ['matrix-token', currentAccount?.did, deviceId ?? null],
    queryFn: () =>
      // Appservice-login deployments only; the current MAS deployment
      // answers 503 MATRIX_CLIENT_LOGIN_REQUIRED, which the caller surfaces
      // by switching to the native authorization-code flow.
      bridgeCallWithProof(BRIDGE_AUDIENCES.session, '/api/matrix-token', {
        deviceId,
        friendlyName,
      }),
    enabled: enabled && !!currentAccount,
    staleTime: 1000 * 60 * 60, // 1 hour — tokens are long-lived in Synapse
    retry: (failureCount, error) =>
      !(error instanceof MatrixProofUnavailableError) && failureCount < 2,
  })
}

export function useUnreadCountQuery({
  enabled = true,
}: {enabled?: boolean} = {}) {
  const {currentAccount} = useSession()
  return useQuery<UnreadResponse>({
    queryKey: ['matrix-unread', currentAccount?.did],
    queryFn: async () => {
      // Background poller: the bridge being down is routine (local dev runs
      // without it), so it must not throw into every badge on the shell. It
      // degrades to a zero count — but flags `unavailable` so the chat list can
      // say so. A silent zero is indistinguishable from "you are caught up",
      // which is the one thing this must never claim while the bridge is down.
      try {
        const res = await matrixBridgeFetch('/api/unread')
        if (!res.ok) {
          throw await getBridgeError(res, 'Failed to fetch unread')
        }
        const data = (await res.json()) as UnreadResponse
        return {...data, unavailable: false}
      } catch (err) {
        logger.warn('matrix: bridge unavailable, defaulting unread to 0', {
          safeMessage: isBridgeAuthError(err)
            ? 'Chat authentication required'
            : 'Chat service unavailable',
        })
        return {unread: 0, communities: [], unavailable: true}
      }
    },
    enabled: enabled && !!currentAccount,
    refetchInterval: 1000 * 60 * 2, // Poll every 2 minutes
  })
}

export function useMatrixRoomsQuery({
  enabled = true,
}: {enabled?: boolean} = {}) {
  const {currentAccount} = useSession()
  return useQuery<{rooms: MatrixRoomSummary[]}>({
    queryKey: ['matrix-rooms', currentAccount?.did],
    queryFn: async () => {
      const res = await matrixBridgeFetch('/api/rooms')
      if (!res.ok) {
        throw await getBridgeError(res, 'Failed to fetch rooms')
      }
      return res.json()
    },
    enabled: enabled && !!currentAccount,
    retry: (count, error) => !isBridgeAuthError(error) && count < 1,
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
        throw await getBridgeError(res, 'Failed to mark read')
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
        throw await getBridgeError(res, 'Failed to register push token')
      }
    },
  })
}

// ─── Constitution as Code: Proposals & Decisions ───

export function useCommunityProposalsQuery(
  communityUri: string | undefined,
  state?: string,
) {
  const viewerDid = useSession().currentAccount?.did
  return useQuery({
    queryKey: ['proposals', communityUri, state, viewerDid],
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
    enabled: !!viewerDid && !!communityUri,
    staleTime: 1000 * 30,
  })
}

export function useCommunityDecisionsQuery(communityUri: string | undefined) {
  const viewerDid = useSession().currentAccount?.did
  return useQuery({
    queryKey: ['decisions', communityUri, viewerDid],
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
    enabled: !!viewerDid && !!communityUri,
    staleTime: 1000 * 60,
  })
}

export function useSortitionProofQuery(
  did: string | undefined,
  communityUri: string | undefined,
) {
  const viewerDid = useSession().currentAccount?.did
  return useQuery({
    queryKey: ['sortition-proof', did, communityUri, viewerDid],
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
    enabled: !!viewerDid && !!did && !!communityUri,
    staleTime: 1000 * 60 * 60, // proofs never change
  })
}

export function useSortitionRunQuery(
  cabildeoUri: string | undefined,
  viewerDid?: string,
) {
  const accountDid = useSession().currentAccount?.did
  return useQuery({
    queryKey: ['sortition-run', cabildeoUri, viewerDid, accountDid],
    queryFn: async () => {
      if (!cabildeoUri) throw new Error('No Cabildeo URI')
      const params = new URLSearchParams({cabildeo: cabildeoUri})
      if (viewerDid) params.set('viewerDid', viewerDid)
      const res = await matrixBridgeFetch(
        `/api/sortition/runs?${params.toString()}`,
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(
          err.error || `Failed to fetch sortition run: ${res.status}`,
        )
      }
      return res.json() as Promise<SortitionRunResponse>
    },
    enabled: !!accountDid && !!cabildeoUri,
    // Keep polling for a live draw, but not against an auth wall: without an
    // M8 session every tick is the same 401.
    refetchInterval: query =>
      isBridgeAuthError(query.state.error) ? false : 10_000,
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
        throw new Error(
          err.error || `Failed to create sortition run: ${res.status}`,
        )
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
  const viewerDid = useSession().currentAccount?.did
  return useQuery({
    queryKey: ['constitution', communityUri, viewerDid],
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
    enabled: !!viewerDid && !!communityUri,
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
  const viewerDid = useSession().currentAccount?.did
  return useQuery<ChatBadgesResponse>({
    queryKey: ['chat-badges', did, communityUri, viewerDid],
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
    enabled: !!viewerDid && !!did && !!communityUri,
    staleTime: 1000 * 60 * 2,
  })
}

export interface MemberListItem {
  did: string
  matrixUserId?: string
  badges: ChatBadge[]
  participation: ParticipationSummary | null
  lastActiveAt?: string
  /** What restricts this member now. The bridge sends it to moderators only. */
  sanction?: {type: SanctionKind; until: string | null}
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
  const viewerDid = useSession().currentAccount?.did
  return useQuery<ChatMemberListResponse>({
    queryKey: ['chat-member-list', communityUri, limit, offset, viewerDid],
    queryFn: async () => {
      if (!communityUri) throw new Error('No community URI')
      const params = new URLSearchParams({
        community: communityUri,
        limit: String(limit),
        offset: String(offset),
      })
      const res = await matrixBridgeFetch(
        `/api/chat-member-list?${params.toString()}`,
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(
          err.error || `Failed to fetch member list: ${res.status}`,
        )
      }
      return res.json()
    },
    enabled: !!viewerDid && !!communityUri,
    staleTime: 1000 * 60,
  })
}

interface ModerationDashboardResponse {
  totalMembers: number
  activeToday: number
  reportedThisWeek: number
  sanctionedNow: number
  riskDistribution: {low: number; warning: number; critical: number}
}

export function useModerationDashboardQuery(
  communityUri: string | undefined,
  modDid: string | undefined,
) {
  const viewerDid = useSession().currentAccount?.did
  return useQuery<ModerationDashboardResponse>({
    queryKey: ['moderation-dashboard', communityUri, modDid, viewerDid],
    queryFn: async () => {
      if (!communityUri || !modDid)
        throw new Error('Missing communityUri or modDid')
      const params = new URLSearchParams({
        community: communityUri,
        modDid,
      })
      const res = await matrixBridgeFetch(
        `/api/moderation-dashboard?${params.toString()}`,
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Failed to fetch dashboard: ${res.status}`)
      }
      return res.json()
    },
    enabled: !!viewerDid && !!communityUri && !!modDid,
    staleTime: 1000 * 60,
  })
}

/**
 * One entry in the moderator report queue: the reports against one message,
 * or against one member when no event was reported. Carries how many people
 * reported, never who, and no message text (the moderator opens the event in
 * the room).
 */
export interface ModerationReportGroup {
  reportedDid: string
  matrixRoomId: string | null
  matrixEventId: string | null
  reportCount: number
  reporterCount: number
  reasons: Record<string, number>
  firstReportedAt: string
  lastReportedAt: string
}

export function useModerationReportsQuery(
  communityUri: string | undefined,
  modDid: string | undefined,
) {
  const viewerDid = useSession().currentAccount?.did
  return useQuery<ModerationReportGroup[]>({
    queryKey: ['moderation-reports', communityUri, modDid, viewerDid],
    queryFn: async () => {
      if (!communityUri || !modDid)
        throw new Error('Missing communityUri or modDid')
      const params = new URLSearchParams({community: communityUri, modDid})
      const res = await matrixBridgeFetch(
        `/api/moderation-reports?${params.toString()}`,
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Failed to fetch reports: ${res.status}`)
      }
      const body = (await res.json()) as {reports: ModerationReportGroup[]}
      return body.reports
    },
    enabled: !!viewerDid && !!communityUri && !!modDid,
    staleTime: 1000 * 30,
  })
}

/*
 * No `context` field: a report never carries message text. The bridge drops it
 * anyway (F4), and D2 has moderators read the message in the room from their
 * own client.
 */
interface ReportUserInput {
  reportedDid: string
  reporterDid: string
  communityUri: string
  reason: string
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

/**
 * Reasons a chat message can be reported for. Must match the bridge's
 * `MESSAGE_REPORT_REASONS`: a fixed set, so the reason cannot carry the text.
 */
export const MESSAGE_REPORT_REASONS = [
  'spam',
  'harassment',
  'hate',
  'violence',
  'impersonation',
  'other',
] as const
export type MessageReportReason = (typeof MESSAGE_REPORT_REASONS)[number]

interface ReportMessageInput {
  reporterDid: string
  communityUri: string
  matrixRoomId: string
  matrixEventId: string
  reason: MessageReportReason
}

/** A refused report, with the bridge's stable code for choosing the copy. */
export class MessageReportError extends Error {
  constructor(
    readonly code: string | undefined,
    message: string,
  ) {
    super(message)
    this.name = 'MessageReportError'
  }
}

/**
 * Report a chat message by room and event. The client never names the
 * sender: it only knows an MXID, and the bridge resolves who that is.
 */
export function useReportMessageMutation() {
  return useMutation<void, Error, ReportMessageInput>({
    mutationFn: async input => {
      const res = await matrixBridgeFetch('/api/moderation-report', {
        method: 'POST',
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as {
          error?: string
          code?: string
        }
        throw new MessageReportError(
          err.code,
          err.error || `Failed to submit report: ${res.status}`,
        )
      }
    },
  })
}

export type SanctionKind = 'mute' | 'ban'

/**
 * How far a sanction got in Matrix. The sanction is always recorded; this says
 * whether the homeserver now holds it:
 * - `applied`: yes, everywhere.
 * - `pending`: the member has no chat account yet; it takes effect when they join.
 * - `partial` / `failed`: the homeserver refused some or all of it. The bridge
 *   re-applies it the next time the member interacts, but a moderator should know.
 */
export interface SanctionEnforcement {
  status: 'applied' | 'partial' | 'failed' | 'pending'
  accounts: number
  applied: number
  failed: number
}

interface ApplySanctionInput {
  targetDid: string
  sanctionedByDid: string
  communityUri: string
  type: SanctionKind
  /** Whole minutes; omit for permanent. */
  durationMinutes?: number
  /** The moderator's own words, kept for the audit trail (500 characters). */
  reason?: string
}

export interface ApplySanctionResult {
  sanction: {type: SanctionKind; until: string | null} | null
  enforcement: SanctionEnforcement
}

/** What a moderator's action changes: refresh everything that shows it. */
function useRefreshModeration() {
  const queryClient = useQueryClient()
  return () => {
    for (const key of [
      'chat-member-list',
      'chat-badges',
      'moderation-dashboard',
      'moderation-reports',
    ]) {
      void queryClient.invalidateQueries({queryKey: [key]})
    }
  }
}

export function useApplySanctionMutation() {
  const refresh = useRefreshModeration()
  return useMutation<ApplySanctionResult, Error, ApplySanctionInput>({
    mutationFn: async input => {
      const res = await matrixBridgeFetch('/api/moderation-sanction', {
        method: 'POST',
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        throw await getBridgeError(res, 'Failed to apply sanction')
      }
      return res.json()
    },
    onSettled: refresh,
  })
}

interface LiftSanctionInput {
  targetDid: string
  communityUri: string
  /** Omit to lift both. */
  type?: SanctionKind
}

export interface LiftSanctionResult {
  /** False when nothing was in force; Matrix is still retried. */
  lifted: boolean
  enforcement: SanctionEnforcement
}

export function useLiftSanctionMutation() {
  const refresh = useRefreshModeration()
  return useMutation<LiftSanctionResult, Error, LiftSanctionInput>({
    mutationFn: async input => {
      const res = await matrixBridgeFetch('/api/moderation-sanction-lift', {
        method: 'POST',
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        throw await getBridgeError(res, 'Failed to lift sanction')
      }
      return res.json()
    },
    onSettled: refresh,
  })
}

interface DismissReportsInput {
  reportedDid: string
  communityUri: string
  /** The reported message; omit to close everything reported about the member. */
  matrixEventId?: string | null
}

/** Close reports a moderator has reviewed: they leave the queue and stop counting. */
export function useDismissReportsMutation() {
  const refresh = useRefreshModeration()
  return useMutation<void, Error, DismissReportsInput>({
    mutationFn: async input => {
      const res = await matrixBridgeFetch('/api/moderation-report-dismiss', {
        method: 'POST',
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        throw await getBridgeError(res, 'Failed to dismiss reports')
      }
    },
    onSettled: refresh,
  })
}

// ─── User Chat Preferences ───

export function useUserChatPreferencesQuery(did: string | undefined) {
  const viewerDid = useSession().currentAccount?.did
  return useQuery<{showChatBadges: boolean}>({
    queryKey: ['user-chat-preferences', did, viewerDid],
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
    enabled: !!viewerDid && !!did,
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
        throw new Error(
          err.error || `Failed to process sortition: ${res.status}`,
        )
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
        throw new Error(
          err.error || `Failed to verify sortition: ${res.status}`,
        )
      }
      return res.json()
    },
  })
}
