import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'

import {CIVIC_TREE_SOURCE_TYPES} from '#/lib/civic-tree-source-types'
import {useAgent} from '#/state/session'
import {
  type GraphData,
  type GraphEdge,
  type GraphNode,
  type Stance,
} from '#/screens/Data/deliberation-types'

export type {GraphData, GraphEdge, GraphNode, Stance}

export type CommunityCivicTreeCardType = string

export type CommunityCivicTreeContributionStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
export type CommunityCivicTreeContributionVote = 'approve' | 'reject'
export type CommunityCivicTreeGovernanceMode =
  | 'votes_sortition'
  | 'moderator_gate'

export interface CommunityCivicTreeCard {
  id: string
  uri?: string
  cid?: string
  community_uri: string
  author_did: string
  title: string
  content: string | null
  card_type: string
  source_uri?: string | null
  source_url: string | null
  extracted_at?: string
  created_at?: string
  updated_at?: string
  is_public?: number | boolean
  passport_visible?: number | boolean
  metadata: string | null
  influence?: number
  vote_count?: number
  stance?: Stance
  compass_quadrant?: string
}

export interface CommunityCivicTreeRelationship {
  id: string
  uri?: string
  cid?: string
  community_uri?: string
  source_card_id: string
  target_card_id: string
  relationship_type: string
  author_did: string
  created_at: string
}

export interface CommunityCivicTreeGraph {
  nodes: CommunityCivicTreeCard[]
  edges: CommunityCivicTreeRelationship[]
}

export interface CommunityTreeContribution {
  id: string
  uri?: string
  cid?: string
  community_uri: string
  author_did: string
  title: string
  content: string | null
  source_uri?: string | null
  source_url: string | null
  source_type: string
  metadata: string | null
  status: CommunityCivicTreeContributionStatus
  approved_card_id: string | null
  created_at: string
  decided_at: string | null
  approve_count: number
  reject_count: number
  viewer_vote?: CommunityCivicTreeContributionVote
}

export interface CreateCommunityTreeContributionInput {
  communityUri: string
  authorDid: string
  title: string
  content?: string
  sourceUri?: string
  sourceUrl?: string
  sourceType: string
  metadata?: string
}

export interface CommunityCivicTreeConfig {
  community_uri: string
  governance_mode: CommunityCivicTreeGovernanceMode
  approvals_required: number
  approval_margin_required: number
  moderator_gate_enabled?: boolean
  sortition_enabled?: boolean
  updated_at?: string
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

export interface CommunityPulse {
  stanceDistribution: {pro: number; con: number; neutral: number}
  topEntities: Array<{value: string; type: string; count: number}>
  trendingClaims: Array<{
    id: string
    title: string
    stance: string
    influence: number
    voteCount: number
    cardType: string
  }>
  controversialClaims: Array<{
    id: string
    title: string
    influence: number
    voteCount: number
    cardType: string
  }>
  userStats?: {
    votesCast: number
    proVotes: number
    conVotes: number
    neutralVotes: number
  }
}

export interface CreateRelationshipInput {
  communityUri: string
  sourceCardId: string
  targetCardId: string
  relationshipType: string
  authorDid: string
}

export const COMMUNITY_CIVIC_TREE_CARD_TYPES = [
  ...CIVIC_TREE_SOURCE_TYPES,
  {value: 'event', label: 'Event', icon: 'E'},
  {value: 'claim', label: 'Claim', icon: 'C'},
  {value: 'question', label: 'Question', icon: '?'},
] as const

export const COMMUNITY_CIVIC_TREE_RELATIONSHIP_TYPES = [
  {
    value: 'supports',
    label: 'Supports',
    color: '#22c55e',
    description: 'Provides evidence or reasoning in favor',
  },
  {
    value: 'opposes',
    label: 'Opposes',
    color: '#ef4444',
    description: 'Provides counter-evidence or reasoning against',
  },
  {
    value: 'addresses',
    label: 'Addresses',
    color: '#3b82f6',
    description: 'Responds to or answers a question or topic',
  },
  {
    value: 'helpful',
    label: 'Helpful',
    color: '#f59e0b',
    description: 'Provides useful context or background',
  },
  {
    value: 'explainer',
    label: 'Explainer',
    color: '#8b5cf6',
    description: 'Clarifies or breaks down a concept',
  },
  {
    value: 'compares_to',
    label: 'Compares to',
    color: '#06b6d4',
    description: 'Draws a parallel or contrast',
  },
] as const

export const COMMUNITY_CIVIC_TREE_STANCE_FILTERS = [
  {value: 'pro', label: 'Pro', color: '#22c55e'},
  {value: 'con', label: 'Con', color: '#ef4444'},
  {value: 'neutral', label: 'Neutral', color: '#9ca3af'},
] as const

export function getCommunityCivicTreeGraphQueryKey(
  communityUri: string | undefined,
) {
  return ['community-civic-tree', 'graph', communityUri] as const
}

export function getCommunityCivicTreeContributionsQueryKey(
  communityUri: string | undefined,
  status: CommunityCivicTreeContributionStatus,
  viewerDid?: string,
) {
  return ['community-civic-tree', 'contributions', communityUri, status, viewerDid] as const
}

export function getCommunityCivicTreeSummaryQueryKey(
  communityUri: string | undefined,
) {
  return ['community-civic-tree', 'summary', communityUri] as const
}

export function getCommunityCivicTreePulseQueryKey(
  communityUri: string | undefined,
  viewerDid?: string,
) {
  return ['community-civic-tree', 'pulse', communityUri, viewerDid] as const
}

export function normalizeCommunityCivicTreeGraph(
  graph: CommunityCivicTreeGraph,
): GraphData {
  return {
    nodes: graph.nodes.map(
      (node): GraphNode => ({
        id: node.id,
        title: node.title,
        card_type: node.card_type,
        author_did: node.author_did,
        community_uri: node.community_uri,
        influence: node.influence ?? 0,
        vote_count: node.vote_count ?? 0,
        stance: node.stance,
        compass_quadrant: node.compass_quadrant,
        content: node.content,
        source_url: node.source_url,
        metadata: node.metadata,
      }),
    ),
    edges: graph.edges.map(
      (edge): GraphEdge => ({
        id: edge.id,
        source: edge.source_card_id,
        target: edge.target_card_id,
        relationship_type: edge.relationship_type,
      }),
    ),
  }
}

export function didContributionBecomeApproved(
  contribution: CommunityTreeContribution,
) {
  return contribution.status === 'approved' && !!contribution.approved_card_id
}

export function useCommunityCivicTreeGraphQuery(
  communityUri: string | undefined,
) {
  const agent = useAgent()
  return useQuery<CommunityCivicTreeGraph>({
    queryKey: getCommunityCivicTreeGraphQueryKey(communityUri),
    queryFn: async () => {
      if (!communityUri) throw new Error('No community URI')
      const res = await agent.call('com.para.community.getCivicTree', {
        community: communityUri,
      })
      return (res.data ?? {nodes: [], edges: []}) as CommunityCivicTreeGraph
    },
    enabled: !!communityUri,
    staleTime: 1000 * 60 * 2,
  })
}

export function useCommunityTreeContributionsQuery(
  communityUri: string | undefined,
  viewerDid?: string,
  status: CommunityCivicTreeContributionStatus = 'pending',
) {
  const agent = useAgent()
  return useQuery<CommunityTreeContribution[]>({
    queryKey: getCommunityCivicTreeContributionsQueryKey(
      communityUri,
      status,
      viewerDid,
    ),
    queryFn: async () => {
      if (!communityUri) throw new Error('No community URI')
      const params: {
        community: string
        status: CommunityCivicTreeContributionStatus
        viewer?: string
      } = {
        community: communityUri,
        status,
      }
      if (viewerDid) params.viewer = viewerDid
      const res = await agent.call(
        'com.para.community.civicTree.listContributions',
        params,
      )
      return (
        (res.data as {contributions?: CommunityTreeContribution[]})
          .contributions ?? []
      )
    },
    enabled: !!communityUri,
    staleTime: 1000 * 30,
  })
}

export function useCreateCommunityTreeContributionMutation() {
  const queryClient = useQueryClient()
  const agent = useAgent()
  return useMutation<
    {contribution: CommunityTreeContribution},
    Error,
    CreateCommunityTreeContributionInput
  >({
    mutationFn: async input => {
      const res = await agent.call(
        'com.para.community.civicTree.submitContribution',
        undefined,
        input,
      )
      return res.data as {contribution: CommunityTreeContribution}
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: getCommunityCivicTreeContributionsQueryKey(
          variables.communityUri,
          'pending',
        ),
      })
      void queryClient.invalidateQueries({
        queryKey: getCommunityCivicTreeSummaryQueryKey(variables.communityUri),
      })
      void queryClient.invalidateQueries({
        queryKey: getCommunityCivicTreePulseQueryKey(variables.communityUri),
      })
    },
  })
}

export function useVoteCommunityTreeContributionMutation() {
  const queryClient = useQueryClient()
  const agent = useAgent()
  return useMutation<
    {contribution: CommunityTreeContribution},
    Error,
    {
      contributionId: string
      communityUri: string
      voterDid: string
      vote: CommunityCivicTreeContributionVote
    }
  >({
    mutationFn: async input => {
      const res = await agent.call(
        'com.para.community.civicTree.voteContribution',
        undefined,
        {
          contribution: input.contributionId,
          voterDid: input.voterDid,
          vote: input.vote,
        },
      )
      return res.data as {contribution: CommunityTreeContribution}
    },
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['community-civic-tree', 'contributions', variables.communityUri],
      })
      if (didContributionBecomeApproved(data.contribution)) {
        void queryClient.invalidateQueries({
          queryKey: getCommunityCivicTreeGraphQueryKey(variables.communityUri),
        })
        void queryClient.invalidateQueries({
          queryKey: getCommunityCivicTreeSummaryQueryKey(variables.communityUri),
        })
        void queryClient.invalidateQueries({
          queryKey: getCommunityCivicTreePulseQueryKey(variables.communityUri),
        })
      }
    },
  })
}

export function useCreateCommunityCivicTreeRelationshipMutation() {
  const queryClient = useQueryClient()
  const agent = useAgent()
  return useMutation<{relationship: CommunityCivicTreeRelationship}, Error, CreateRelationshipInput>({
    mutationFn: async input => {
      const res = await agent.call(
        'com.para.community.civicTree.createRelationship',
        undefined,
        input,
      )
      return res.data as {relationship: CommunityCivicTreeRelationship}
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: getCommunityCivicTreeGraphQueryKey(variables.communityUri),
      })
      void queryClient.invalidateQueries({
        queryKey: getCommunityCivicTreeSummaryQueryKey(variables.communityUri),
      })
    },
  })
}

export function useCommunityCivicTreeCardVoteQuery(
  cardId: string | undefined,
  voterDid: string | undefined,
) {
  const agent = useAgent()
  return useQuery<{vote: {influence: number} | null}>({
    queryKey: ['community-civic-tree', 'card-vote', cardId, voterDid],
    queryFn: async () => {
      if (!cardId || !voterDid) throw new Error('Missing card or voter')
      const res = await agent.call('com.para.community.civicTree.getCardVote', {
        card: cardId,
        voter: voterDid,
      })
      return res.data as {vote: {influence: number} | null}
    },
    enabled: !!cardId && !!voterDid,
    staleTime: 1000 * 30,
  })
}

export function useCastCommunityCivicTreeVoteMutation() {
  const queryClient = useQueryClient()
  const agent = useAgent()
  return useMutation<
    {success: boolean; totalInfluence: number; voteCount: number},
    Error,
    {cardId: string; voterDid: string; influence: number; communityUri?: string}
  >({
    mutationFn: async input => {
      const res = await agent.call(
        'com.para.community.civicTree.castCardVote',
        undefined,
        {
          card: input.cardId,
          voterDid: input.voterDid,
          influence: input.influence,
        },
      )
      return res.data as {
        success: boolean
        totalInfluence: number
        voteCount: number
      }
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['community-civic-tree', 'card-vote', variables.cardId, variables.voterDid],
      })
      if (variables.communityUri) {
        void queryClient.invalidateQueries({
          queryKey: getCommunityCivicTreeGraphQueryKey(variables.communityUri),
        })
        void queryClient.invalidateQueries({
          queryKey: getCommunityCivicTreePulseQueryKey(variables.communityUri),
        })
        void queryClient.invalidateQueries({
          queryKey: getCommunityCivicTreeSummaryQueryKey(variables.communityUri),
        })
      } else {
        void queryClient.invalidateQueries({queryKey: ['community-civic-tree']})
      }
    },
  })
}

export function useCommunityCivicTreeSummaryQuery(
  communityUri: string | undefined,
) {
  const agent = useAgent()
  return useQuery<DeliberationSummary>({
    queryKey: getCommunityCivicTreeSummaryQueryKey(communityUri),
    queryFn: async () => {
      if (!communityUri) throw new Error('No community URI')
      const res = await agent.call('com.para.community.civicTree.getSummary', {
        community: communityUri,
      })
      return res.data as DeliberationSummary
    },
    enabled: !!communityUri,
    staleTime: 1000 * 60 * 5,
  })
}

export function useCommunityCivicTreePulseQuery(
  communityUri: string | undefined,
  voterDid?: string,
) {
  const agent = useAgent()
  return useQuery<CommunityPulse>({
    queryKey: getCommunityCivicTreePulseQueryKey(communityUri, voterDid),
    queryFn: async () => {
      if (!communityUri) throw new Error('No community URI')
      const params: {community: string; voter?: string} = {
        community: communityUri,
      }
      if (voterDid) params.voter = voterDid
      const res = await agent.call('com.para.community.civicTree.getPulse', {
        ...params,
      })
      return res.data as CommunityPulse
    },
    enabled: !!communityUri,
    staleTime: 1000 * 60 * 2,
  })
}

export function useCommunityCivicTreeSuggestionsQuery(
  communityUri: string | undefined,
) {
  const agent = useAgent()
  return useQuery<SuggestedRelationship[]>({
    queryKey: ['community-civic-tree', 'suggestions', communityUri],
    queryFn: async () => {
      if (!communityUri) throw new Error('No community URI')
      const res = await agent.call(
        'com.para.community.civicTree.listSuggestions',
        {community: communityUri, status: 'pending'},
      )
      return (res.data as {suggestions?: SuggestedRelationship[]}).suggestions ?? []
    },
    enabled: !!communityUri,
    staleTime: 1000 * 60 * 2,
  })
}

export function useAcceptCommunityCivicTreeSuggestionMutation() {
  const queryClient = useQueryClient()
  const agent = useAgent()
  return useMutation<void, Error, {id: string; communityUri?: string; authorDid: string}>({
    mutationFn: async input => {
      await agent.call(
        'com.para.community.civicTree.acceptSuggestion',
        undefined,
        input,
      )
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['community-civic-tree', 'suggestions', variables.communityUri],
      })
      if (variables.communityUri) {
        void queryClient.invalidateQueries({
          queryKey: getCommunityCivicTreeGraphQueryKey(variables.communityUri),
        })
      }
    },
  })
}

export function useRejectCommunityCivicTreeSuggestionMutation() {
  const queryClient = useQueryClient()
  const agent = useAgent()
  return useMutation<void, Error, {id: string; communityUri?: string}>({
    mutationFn: async input => {
      await agent.call(
        'com.para.community.civicTree.rejectSuggestion',
        undefined,
        input,
      )
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['community-civic-tree', 'suggestions', variables.communityUri],
      })
    },
  })
}
