import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'

import {CIVIC_TREE_SOURCE_TYPES} from '#/lib/civic-tree-source-types'
import {
  type GraphData,
  type GraphEdge,
  type GraphNode,
  type Stance,
} from '#/screens/Base/deliberation-types'

const BRIDGE_API_URL =
  process.env.EXPO_PUBLIC_MATRIX_BRIDGE_URL || 'https://bridge.para.social'

// Re-export so existing consumers of these types from this module keep working
export type {GraphData, GraphEdge, GraphNode, Stance}

export interface DeliberationCard {
  id: string
  community_uri: string
  author_did: string
  title: string
  content: string | null
  card_type: string
  source_room_id: string | null
  source_event_id: string | null
  source_url: string | null
  extracted_at: string
  is_public: number
  passport_visible: number
  metadata: string | null
  influence?: number
  vote_count?: number
  stance?: Stance
  compass_quadrant?: string
}

export interface DeliberationRelationship {
  id: string
  source_card_id: string
  target_card_id: string
  relationship_type: string
  author_did: string
  created_at: string
}

export interface DeliberationGraph {
  nodes: DeliberationCard[]
  edges: DeliberationRelationship[]
}

export function useDeliberationCardsQuery(communityUri: string | undefined) {
  return useQuery<DeliberationCard[]>({
    queryKey: ['deliberation-cards', communityUri],
    queryFn: async () => {
      if (!communityUri) throw new Error('No community URI')
      const res = await fetch(
        `${BRIDGE_API_URL}/api/cards?community=${encodeURIComponent(communityUri)}`,
      )
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as {error?: string}
        throw new Error(err.error || `Failed to fetch cards: ${res.status}`)
      }
      const data = (await res.json()) as {cards: DeliberationCard[]}
      return data.cards
    },
    enabled: !!communityUri,
    staleTime: 1000 * 60 * 2,
  })
}

export function useDeliberationGraphQuery(communityUri: string | undefined) {
  return useQuery<DeliberationGraph>({
    queryKey: ['deliberation-graph', communityUri],
    queryFn: async () => {
      if (!communityUri) throw new Error('No community URI')
      const res = await fetch(
        `${BRIDGE_API_URL}/api/graph?community=${encodeURIComponent(communityUri)}`,
      )
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as {error?: string}
        throw new Error(err.error || `Failed to fetch graph: ${res.status}`)
      }
      return res.json() as Promise<DeliberationGraph>
    },
    enabled: !!communityUri,
    staleTime: 1000 * 60 * 2,
  })
}

export interface CreateCardInput {
  communityUri: string
  authorDid: string
  title: string
  content?: string
  cardType?: string
  sourceUrl?: string
  isPublic?: boolean
  passportVisible?: boolean
  metadata?: string
}

export type CommunityTreeContributionStatus = 'pending' | 'approved' | 'rejected'
export type CommunityTreeContributionVote = 'approve' | 'reject'

export interface CommunityTreeContribution {
  id: string
  community_uri: string
  author_did: string
  title: string
  content: string | null
  source_url: string | null
  source_type: string
  metadata: string | null
  status: CommunityTreeContributionStatus
  approved_card_id: string | null
  created_at: string
  decided_at: string | null
  approve_count: number
  reject_count: number
  viewer_vote?: CommunityTreeContributionVote
}

export interface CreateCommunityTreeContributionInput {
  communityUri: string
  authorDid: string
  title: string
  content?: string
  sourceUrl?: string
  sourceType: string
  metadata?: string
}

export function useCreateCardMutation() {
  const queryClient = useQueryClient()
  return useMutation<{id: string}, Error, CreateCardInput>({
    mutationFn: async input => {
      const res = await fetch(`${BRIDGE_API_URL}/api/cards`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as {error?: string}
        throw new Error(err.error || `Failed to create card: ${res.status}`)
      }
      return res.json() as Promise<{id: string}>
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['deliberation-graph', variables.communityUri],
      })
      void queryClient.invalidateQueries({
        queryKey: ['deliberation-cards', variables.communityUri],
      })
      void queryClient.invalidateQueries({
        queryKey: ['community-pulse', variables.communityUri],
      })
      void queryClient.invalidateQueries({
        queryKey: ['deliberation-summary', variables.communityUri],
      })
    },
  })
}

export function useCommunityTreeContributionsQuery(
  communityUri: string | undefined,
  viewerDid?: string,
  status: CommunityTreeContributionStatus = 'pending',
) {
  return useQuery<CommunityTreeContribution[]>({
    queryKey: ['community-tree-contributions', communityUri, status, viewerDid],
    queryFn: async () => {
      if (!communityUri) throw new Error('No community URI')
      const url = new URL(`${BRIDGE_API_URL}/api/community-tree/contributions`)
      url.searchParams.set('community', communityUri)
      url.searchParams.set('status', status)
      if (viewerDid) url.searchParams.set('viewer', viewerDid)
      const res = await fetch(url.toString())
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as {error?: string}
        throw new Error(err.error || `Failed to fetch contributions: ${res.status}`)
      }
      const data = (await res.json()) as {
        contributions: CommunityTreeContribution[]
      }
      return data.contributions
    },
    enabled: !!communityUri,
    staleTime: 1000 * 30,
  })
}

export function useCreateCommunityTreeContributionMutation() {
  const queryClient = useQueryClient()
  return useMutation<
    {contribution: CommunityTreeContribution},
    Error,
    CreateCommunityTreeContributionInput
  >({
    mutationFn: async input => {
      const res = await fetch(`${BRIDGE_API_URL}/api/community-tree/contributions`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as {error?: string}
        throw new Error(err.error || `Failed to create contribution: ${res.status}`)
      }
      return res.json() as Promise<{contribution: CommunityTreeContribution}>
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['community-tree-contributions', variables.communityUri],
      })
    },
  })
}

export function useVoteCommunityTreeContributionMutation() {
  const queryClient = useQueryClient()
  return useMutation<
    {contribution: CommunityTreeContribution},
    Error,
    {contributionId: string; communityUri: string; voterDid: string; vote: CommunityTreeContributionVote}
  >({
    mutationFn: async input => {
      const res = await fetch(
        `${BRIDGE_API_URL}/api/community-tree/contributions/vote`,
        {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            contributionId: input.contributionId,
            voterDid: input.voterDid,
            vote: input.vote,
          }),
        },
      )
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as {error?: string}
        throw new Error(err.error || `Failed to vote on contribution: ${res.status}`)
      }
      return res.json() as Promise<{contribution: CommunityTreeContribution}>
    },
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['community-tree-contributions', variables.communityUri],
      })
      if (data.contribution.status === 'approved') {
        void queryClient.invalidateQueries({
          queryKey: ['deliberation-graph', variables.communityUri],
        })
        void queryClient.invalidateQueries({
          queryKey: ['deliberation-cards', variables.communityUri],
        })
        void queryClient.invalidateQueries({
          queryKey: ['community-pulse', variables.communityUri],
        })
        void queryClient.invalidateQueries({
          queryKey: ['deliberation-summary', variables.communityUri],
        })
      }
    },
  })
}

export interface CreateRelationshipInput {
  sourceCardId: string
  targetCardId: string
  relationshipType: string
  authorDid: string
}

export function useCreateRelationshipMutation() {
  const queryClient = useQueryClient()
  return useMutation<{id: string}, Error, CreateRelationshipInput>({
    mutationFn: async input => {
      const res = await fetch(`${BRIDGE_API_URL}/api/relationships`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as {error?: string}
        throw new Error(err.error || `Failed to create relationship: ${res.status}`)
      }
      return res.json() as Promise<{id: string}>
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({queryKey: ['deliberation-graph']})
      void queryClient.invalidateQueries({queryKey: ['deliberation-summary']})
    },
  })
}

export interface SuggestedRelationship {
  id: string
  source_card_id: string
  target_card_id: string
  relationship_type: string
  confidence: number
  reason: string
  status: string
  source_title: string
  source_type: string
  target_title: string
  target_type: string
}

export function useSuggestionsQuery(communityUri: string | undefined) {
  return useQuery<SuggestedRelationship[]>({
    queryKey: ['deliberation-suggestions', communityUri],
    queryFn: async () => {
      if (!communityUri) throw new Error('No community URI')
      const res = await fetch(
        `${BRIDGE_API_URL}/api/suggestions?community=${encodeURIComponent(communityUri)}&status=pending`,
      )
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as {error?: string}
        throw new Error(err.error || `Failed to fetch suggestions: ${res.status}`)
      }
      const data = (await res.json()) as {suggestions: SuggestedRelationship[]}
      return data.suggestions
    },
    enabled: !!communityUri,
    staleTime: 1000 * 60 * 2,
  })
}

export function useAcceptSuggestionMutation() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, {id: string; authorDid: string}>({
    mutationFn: async input => {
      const res = await fetch(`${BRIDGE_API_URL}/api/suggestions/accept`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as {error?: string}
        throw new Error(err.error || `Failed to accept suggestion: ${res.status}`)
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({queryKey: ['deliberation-suggestions']})
      void queryClient.invalidateQueries({queryKey: ['deliberation-graph']})
    },
  })
}

export function useRejectSuggestionMutation() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, {id: string}>({
    mutationFn: async input => {
      const res = await fetch(`${BRIDGE_API_URL}/api/suggestions/reject`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as {error?: string}
        throw new Error(err.error || `Failed to reject suggestion: ${res.status}`)
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({queryKey: ['deliberation-suggestions']})
    },
  })
}

export interface DeliberationSummary {
  normalizedClaims: Array<{
    claim: string
    stance: 'support' | 'oppose' | 'unsure' | 'amendment' | 'needs_evidence'
    sourceType: string
    sourceId?: string
  }>
  tensionLines: Array<{
    axis: string
    summary: string
    sides: string[]
    relatedClaimIds?: string[]
  }>
  openQuestions: Array<{
    question: string
    whyItMatters: string
    relatedClaimIds?: string[]
  }>
  consensusAreas: Array<{topic: string; claims: string[]}>
  unresolvedConflicts: Array<{topic: string; opposingClaims: string[]}>
  bridgeStatements: string[]
  stanceDistribution: {pro: number; con: number; neutral: number}
  totalClaims: number
  totalRelationships: number
  generatedAt: string
}

export interface VoteResult {
  success: boolean
  totalInfluence: number
  voteCount: number
}

export function useCardVoteQuery(cardId: string | undefined, voterDid: string | undefined) {
  return useQuery<{vote: {influence: number} | null}>({
    queryKey: ['card-vote', cardId, voterDid],
    queryFn: async () => {
      if (!cardId || !voterDid) throw new Error('Missing cardId or voterDid')
      const res = await fetch(
        `${BRIDGE_API_URL}/api/votes?card=${encodeURIComponent(cardId)}&voter=${encodeURIComponent(voterDid)}`,
      )
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as {error?: string}
        throw new Error(err.error || `Failed to fetch vote: ${res.status}`)
      }
      return res.json()
    },
    enabled: !!cardId && !!voterDid,
    staleTime: 1000 * 30,
  })
}

export function useCastVoteMutation() {
  const queryClient = useQueryClient()
  return useMutation<VoteResult, Error, {cardId: string; voterDid: string; influence: number}>({
    mutationFn: async input => {
      const res = await fetch(`${BRIDGE_API_URL}/api/vote`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as {error?: string}
        throw new Error(err.error || `Failed to cast vote: ${res.status}`)
      }
      return res.json() as Promise<VoteResult>
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({queryKey: ['card-vote', variables.cardId, variables.voterDid]})
      void queryClient.invalidateQueries({queryKey: ['deliberation-graph']})
      void queryClient.invalidateQueries({queryKey: ['deliberation-cards']})
      void queryClient.invalidateQueries({queryKey: ['community-pulse']})
      void queryClient.invalidateQueries({queryKey: ['deliberation-summary']})
    },
  })
}

export function useDeliberationSummaryQuery(communityUri: string | undefined) {
  return useQuery<DeliberationSummary>({
    queryKey: ['deliberation-summary', communityUri],
    queryFn: async () => {
      if (!communityUri) throw new Error('No community URI')
      const res = await fetch(
        `${BRIDGE_API_URL}/api/summarize?community=${encodeURIComponent(communityUri)}`,
      )
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as {error?: string}
        throw new Error(err.error || `Failed to summarize: ${res.status}`)
      }
      return res.json()
    },
    enabled: !!communityUri,
    staleTime: 1000 * 60 * 5,
  })
}

export const RELATIONSHIP_TYPES = [
  {value: 'supports', label: 'Supports', color: '#22c55e', description: 'Provides evidence or reasoning in favor'},
  {value: 'opposes', label: 'Opposes', color: '#ef4444', description: 'Provides counter-evidence or reasoning against'},
  {value: 'addresses', label: 'Addresses', color: '#3b82f6', description: 'Responds to or answers a question or topic'},
  {value: 'helpful', label: 'Helpful', color: '#f59e0b', description: 'Provides useful context or background'},
  {value: 'explainer', label: 'Explainer', color: '#8b5cf6', description: 'Clarifies or breaks down a concept'},
  {value: 'compares_to', label: 'Compares to', color: '#06b6d4', description: 'Draws a parallel or contrast'},
] as const

export const CARD_TYPES = [
  ...CIVIC_TREE_SOURCE_TYPES,
  {value: 'event', label: 'Event', icon: '📅'},
  {value: 'claim', label: 'Claim', icon: '💡'},
  {value: 'question', label: 'Question', icon: '❓'},
] as const

export interface CommunityPulse {
  stanceDistribution: {pro: number; con: number; neutral: number}
  topEntities: Array<{value: string; type: string; count: number}>
  trendingClaims: Array<{id: string; title: string; stance: string; influence: number; voteCount: number; cardType: string}>
  controversialClaims: Array<{id: string; title: string; influence: number; voteCount: number; cardType: string}>
  userStats?: {votesCast: number; proVotes: number; conVotes: number; neutralVotes: number}
}

export function useCommunityPulseQuery(communityUri: string | undefined, voterDid?: string) {
  return useQuery<CommunityPulse>({
    queryKey: ['community-pulse', communityUri, voterDid],
    queryFn: async () => {
      if (!communityUri) throw new Error('No community URI')
      const url = new URL(`${BRIDGE_API_URL}/api/community-pulse`)
      url.searchParams.set('community', communityUri)
      if (voterDid) url.searchParams.set('voter', voterDid)
      const res = await fetch(url.toString())
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as {error?: string}
        throw new Error(err.error || `Failed to fetch pulse: ${res.status}`)
      }
      return res.json()
    },
    enabled: !!communityUri,
    staleTime: 1000 * 60 * 2,
  })
}

export const STANCE_FILTERS = [
  {value: 'pro', label: 'Pro', color: '#22c55e'},
  {value: 'con', label: 'Con', color: '#ef4444'},
  {value: 'neutral', label: 'Neutral', color: '#9ca3af'},
] as const
