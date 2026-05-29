/**
 * Para Custom Lexicons
 *
 * These interfaces define the schema for our custom "off-protocol" records.
 *
 * com.para.post:
 * - A private-by-default post type.
 * - Not indexed by standard Bluesky AppViews.
 * - Visible only within the Para app context.
 *
 * com.para.identity:
 * - Tracks verification status for Public Figure capabilities.
 */

import {type AppBskyFeedPost} from '@atproto/api'

export const PARA_POST_COLLECTION = 'com.para.post'
export const PARA_IDENTITY_COLLECTION = 'com.para.identity'
export const PARA_FOLLOWED_ELEMENT_COLLECTION = 'com.para.followedElement'
export const PARA_POST_META_COLLECTION = 'com.para.social.postMeta'
export const PARA_OPEN_QUESTION_COLLECTION = 'com.para.civic.openQuestion'
export const PARA_OPEN_QUESTION_VOTE_COLLECTION =
  'com.para.civic.openQuestionVote'
export const PARA_COMMUNITY_GOVERNANCE_COLLECTION =
  'com.para.community.governance'
export const PARA_COMMUNITY_CIVIC_TREE_CARD_COLLECTION =
  'com.para.community.civicTree.card'
export const PARA_COMMUNITY_CIVIC_TREE_RELATIONSHIP_COLLECTION =
  'com.para.community.civicTree.relationship'
export const PARA_COMMUNITY_CIVIC_TREE_CONTRIBUTION_COLLECTION =
  'com.para.community.civicTree.contribution'
export const PARA_COMMUNITY_CIVIC_TREE_CONTRIBUTION_VOTE_COLLECTION =
  'com.para.community.civicTree.contributionVote'
export const PARA_COMMUNITY_CIVIC_TREE_CARD_VOTE_COLLECTION =
  'com.para.community.civicTree.cardVote'
export const PARA_COMMUNITY_CIVIC_TREE_CONFIG_COLLECTION =
  'com.para.community.civicTree.config'
export const PARA_HIGHLIGHT_COLLECTION = 'com.para.highlight.annotation'
export const PARA_OFFICIAL_CIVIC_ENTITY_COLLECTION = 'com.para.official.entity'
export const PARA_OFFICIAL_CIVIC_CONTROLLER_COLLECTION =
  'com.para.official.controller'
export const PARA_OFFICIAL_CIVIC_ACTION_COLLECTION = 'com.para.official.action'

export interface ParaPostRecord {
  text: string
  createdAt: string
  /**
   * Reply context (root and parent).
   * Matches specific structure needed for threading.
   */
  reply?: {
    root: com_atproto_repo_strongRef
    parent: com_atproto_repo_strongRef
  }
  /**
   * Facets for rich text (mentions, links).
   * Reusing standard Bsky definition for compatibility.
   */
  facets?: unknown[] // Simplified for now to avoid deep type lookup issues
  /**
   * Embeds (images, external links, etc).
   * Reusing standard Bsky definition.
   */
  embed?: AppBskyFeedPost.Record['embed']
  /**
   * Languages.
   */
  langs?: string[]
  /**
   * Additional hashtags, beyond those in post text and facets.
   */
  tags?: string[]
  /**
   * Para-specific flairs associated with the post.
   */
  flairs?: string[]
  /**
   * Para-specific post type (policy, matter, meme, etc).
   */
  postType?: string
  /**
   * Party affiliation for feed indexing (e.g. 'Morena', 'PAN').
   */
  party?: string
  /**
   * Community slug for feed indexing (e.g. 'jalisco', 'cdmx').
   */
  community?: string
}

export interface ParaPostMetaRecord {
  post: string // at-uri referencing the com.para.post
  postType: 'policy' | 'matter' | 'meme'
  official?: boolean
  party?: string
  community?: string
  category?: string
  tags?: string[]
  flairs?: string[]
  voteScore: number
  createdAt: string
}

export interface ParaOpenQuestionRecord {
  text: string
  community?: string
  tags?: string[]
  createdAt: string
}

export interface ParaOpenQuestionVoteRecord {
  subject: string
  value: -1 | 0 | 1
  voteNullifier?: string
  eligibilityProofRef?: string
  createdAt: string
}

export interface ParaIdentityRecord {
  createdAt: string
  isVerifiedPublicFigure: boolean
  /**
   * Reference to the proof document (e.g. uploaded INE image blob).
   * Optional for mock MVP.
   */
  proofBlob?: string
  /**
   * Timestamp when verification was approved.
   */
  verifiedAt?: string
  /**
   * Visibility settings synced via ATProto so other users can read them.
   */
  publicVotes?: boolean
  publicRaq?: boolean
  publicHighlights?: boolean
  /**
   * Civic metadata displayed on the profile header.
   */
  state?: string
  compassPosition?: string
  party?: string
}

export type OfficialCivicEntityKind =
  | 'representative'
  | 'office'
  | 'community'
  | 'party'
  | 'ngo'

export type OfficialCivicEntityStatus = 'unclaimed' | 'verified' | 'retired'

export type OfficialCivicScope =
  | 'official.profile.manage'
  | 'official.controllers.manage'
  | 'official.post.write'
  | 'official.pajareo.respond'
  | 'official.cabildeo.sign'
  | 'official.audit.view'

export type OfficialControllerStatus = 'pending' | 'active' | 'revoked'

export type OfficialControllerVisibility = 'entity_default' | 'revealed'

export type OfficialActionType =
  | 'pajareo.response'
  | 'post.write'
  | 'cabildeo.signature'

export type CabildeoAccessTier =
  | 'public'
  | 'signed_in'
  | 'verified_human'
  | 'verified_area'
  | 'community_member'
  | 'delegate'
  | 'official_controller'

export type CabildeoVoteVisibility = 'public' | 'party_only' | 'anonymous'

export interface OfficialCivicEntityRecord {
  kind: OfficialCivicEntityKind
  status: OfficialCivicEntityStatus
  name: string
  handle: string
  office?: string
  jurisdiction?: string
  state?: string
  source?: string
  entityDid?: string
  createdAt: string
  updatedAt: string
}

export interface OfficialCivicControllerRecord {
  entity: string
  controllerDid: string
  scopes: OfficialCivicScope[]
  status: OfficialControllerStatus
  visibilityDefault: OfficialControllerVisibility
  approvedByDid?: string
  expiresAt?: string
  revokedAt?: string
  createdAt: string
}

export interface OfficialCivicActionRecord {
  entity: string
  actionType: OfficialActionType
  subjectUri: string
  recordUri?: string
  controllerHash: string
  controllerVisibility: OfficialControllerVisibility
  revealedControllerDid?: string
  summary: string
  createdAt: string
}

export interface ParaHighlightRecord {
  subjectUri: string
  subjectCid?: string
  text: string
  start: number
  end: number
  color: string
  tag?: string
  community?: string
  state?: string
  party?: string
  visibility: 'public' | 'private'
  createdAt: string
}

export type CommunityGovernanceCapability =
  | 'appoint_deputies'
  | 'edit_role_descriptions'
  | 'review_applicants'
  | 'publish_governance_updates'
  | 'set_official_representatives'

export interface CommunityGovernancePerson {
  did?: string
  handle?: string
  displayName?: string
  avatar?: string
}

export interface CommunityGovernanceModerator
  extends CommunityGovernancePerson {
  role: string
  badge: string
  capabilities: CommunityGovernanceCapability[]
}

export interface CommunityGovernanceOfficialRepresentative
  extends CommunityGovernancePerson {
  office: string
  mandate: string
}

export interface CommunityGovernanceApplicant
  extends CommunityGovernancePerson {
  appliedAt: string
  status: 'applied' | 'approved' | 'rejected'
  note?: string
}

export interface CommunityGovernanceDeputyRole {
  key: string
  tier: string
  role: string
  description: string
  capabilities: string[]
  activeHolder?: CommunityGovernancePerson
  activeSince?: string
  votes: number
  applicants: CommunityGovernanceApplicant[]
}

export interface CommunityGovernanceMetadata {
  termLengthDays?: number
  reviewCadence?: string
  escalationPath?: string
  publicContact?: string
  lastPublishedAt?: string
  state?: string
  matterFlairIds?: string[]
  policyFlairIds?: string[]
}

export interface CommunityGovernanceHistoryEntry {
  id: string
  action: string
  actorDid?: string
  actorHandle?: string
  createdAt: string
  summary: string
}

export interface CommunityGovernanceRecord {
  community: string
  communityId?: string
  slug: string
  createdAt: string
  updatedAt: string
  moderators: CommunityGovernanceModerator[]
  officials: CommunityGovernanceOfficialRepresentative[]
  deputies: CommunityGovernanceDeputyRole[]
  metadata?: CommunityGovernanceMetadata
  editHistory?: CommunityGovernanceHistoryEntry[]
}

export type CommunityCivicTreeCardType = string

export type CommunityCivicTreeStance = 'pro' | 'con' | 'neutral'

export type CommunityCivicTreeRelationshipType = string

export type CommunityCivicTreeContributionStatus =
  | 'pending'
  | 'approved'
  | 'rejected'

export type CommunityCivicTreeContributionVoteValue = 'approve' | 'reject'

export type CommunityCivicTreeGovernanceMode =
  | 'votes_sortition'
  | 'moderator_gate'

export interface CommunityCivicTreeCardRecord {
  communityUri: string
  authorDid: string
  title: string
  content?: string
  cardType: CommunityCivicTreeCardType
  stance?: CommunityCivicTreeStance
  compassQuadrant?: string
  sourceUri?: string
  sourceUrl?: string
  metadata?: string
  createdAt: string
  updatedAt?: string
}

export interface CommunityCivicTreeRelationshipRecord {
  communityUri: string
  sourceCard: string
  targetCard: string
  relationshipType: CommunityCivicTreeRelationshipType
  authorDid: string
  createdAt: string
}

export interface CommunityCivicTreeContributionRecord {
  communityUri: string
  authorDid: string
  title: string
  content?: string
  sourceUri?: string
  sourceUrl?: string
  sourceType: string
  metadata?: string
  status: CommunityCivicTreeContributionStatus
  approvedCard?: string
  createdAt: string
  decidedAt?: string
}

export interface CommunityCivicTreeContributionVoteRecord {
  contribution: string
  voterDid: string
  vote: CommunityCivicTreeContributionVoteValue
  createdAt: string
}

export interface CommunityCivicTreeCardVoteRecord {
  card: string
  voterDid: string
  influence: number
  createdAt: string
}

export interface CommunityCivicTreeConfigRecord {
  communityUri: string
  governanceMode: CommunityCivicTreeGovernanceMode
  approvalsRequired: number
  approvalMarginRequired: number
  moderatorGateEnabled?: boolean
  sortitionEnabled?: boolean
  updatedAt: string
}

// Helper types matching ATProto common patterns
interface com_atproto_repo_strongRef {
  cid: string
  uri: string
}

/**
 * Type guard to check if a generic record looks like a Para Post.
 */
export function isParaPost(v: unknown): v is ParaPostRecord {
  return (
    typeof v === 'object' &&
    v !== null &&
    typeof (v as Record<string, unknown>).text === 'string' &&
    typeof (v as Record<string, unknown>).createdAt === 'string'
  )
}

// ─── Cabildeo: Civic Deliberation ────────────────────────────────────────────

export const PARA_CABILDEO_COLLECTION = 'com.para.civic.cabildeo'
export const PARA_CIVIC_POSITION_COLLECTION = 'com.para.civic.position'
export const PARA_CIVIC_VOTE_COLLECTION = 'com.para.civic.vote'
export const PARA_CIVIC_DELEGATION_COLLECTION = 'com.para.civic.delegation'

export type CabildeoPhase =
  | 'draft'
  | 'open'
  | 'deliberating'
  | 'voting'
  | 'resolved'

export interface CabildeoOption {
  label: string
  description?: string
  isConsensus?: boolean
}

export interface CabildeoOutcomeBreakdown {
  optionIndex: number
  label: string
  effectiveVotes: number
}

export interface CabildeoCommunityBreakdown {
  community: string
  dominantOption: number
  participation: string
}

export interface CabildeoOutcome {
  winningOption: number
  totalParticipants: number
  directVoters: number
  delegatedVoters: number
  effectiveTotalPower: number
  breakdown: CabildeoOutcomeBreakdown[]
  communityBreakdown?: CabildeoCommunityBreakdown[]
}

export interface CabildeoUserContext {
  viewerVoteOption?: number
  viewerVoteIsDirect?: boolean
  viewerVoteCreatedAt?: string
  hasDelegatedTo?: string
  delegateVoteEvent?: {
    optionIndex: number
    votedAt: string
    isDismissed?: boolean // Mock locally if dismissed
  }
}

export interface GeoPointE7 {
  latE7: number // latitude × 10⁷
  lngE7: number // longitude × 10⁷
}

export interface CabildeoRecord {
  title: string
  description: string
  createdAt: string
  author: string // DID of proposer

  // Classification
  community: string // Primary community name
  communities?: string[] // Additional communities (triggers quadratic weighting)
  flairs?: string[] // Policy/matter tags
  region?: string // Geographic scope (state name)
  geoRestricted?: boolean // If true, only users in `region` can vote/delegate
  geo?: GeoPointE7 // Precise coordinates for map placement
  positionalAccuracy?: number // Accuracy in meters of the `geo` fix

  // Geo-privacy scope: user-selected precision level
  geoScope?: 'state' | 'district' | 'city' | 'neighborhood'
  districtKey?: string // Federal electoral district (e.g. 'jalisco:3')
  city?: string // City or municipality name
  neighborhood?: string // Colonia / neighborhood name

  // Voting configuration
  options: CabildeoOption[]
  minQuorum?: number // Minimum number of participants required for outcome to be valid
  minimumViewTier?: CabildeoAccessTier
  minimumParticipationTier?: CabildeoAccessTier
  voteVisibility?: CabildeoVoteVisibility

  // Lifecycle
  phase: CabildeoPhase
  phaseDeadline?: string // ISO timestamp

  // Outcome (set when resolved)
  outcome?: CabildeoOutcome

  // Client-side context
  userContext?: CabildeoUserContext
}

export interface CabildeoPositionRecord {
  cabildeo: string // at-uri
  stance: 'for' | 'against' | 'amendment'
  optionIndex?: number
  text: string
  createdAt: string
  compassQuadrant?: string // e.g., 'lib-left', 'auth-center'
  constructivenessScore?: number // 0.0 to 1.0 score evaluated by WorldTensor
}

export interface CabildeoVoteRecord {
  subject?: string // at-uri for the voted record; defaults to cabildeo for cabildeo option votes
  subjectType?: 'cabildeo' | 'policy' | 'matter' | 'governance'
  cabildeo: string // at-uri
  createdAt: string
  selectedOption?: number
  signal?: -3 | -2 | -1 | 0 | 1 | 2 | 3
  reason?: string
  isDirect: boolean
  delegatedFrom: string[] // DIDs of delegators
  voteNullifier?: string
  eligibilityProofRef?: string
  effectivePower: number // √N for delegated, 1.0 for direct
}

export interface CabildeoDelegationRecord {
  cabildeo?: string // at-uri
  delegateTo?: string // DID of representative for active cessions
  createdAt: string
  mode?: 'active' | 'passive'
  party?: string
  community?: string
  preferredOption?: number
  signal?: -3 | -2 | -1 | 0 | 1 | 2 | 3
  reason?: string
  scopeFlairs?: string[] // Optional: Only delegate power for cabildeos matching these policy/matter flairs
}
// ─── Discourse Analysis ──────────────────────────────────────────────────────

export interface DiscourseSnapshot {
  community: string
  bucket: string // ISO timestamp
  postCount: number
  uniqueAuthors: number
  avgConstructiveness: number // 0-100
  semanticVolatility: number // 0-100
  lexicalDiversity: number // 0-100
  polarizationDelta: number // 0-100
  echoChamberIndex: number // 0-100
  topKeywords: string // JSON string
  sentimentDistribution: string // JSON string
}

export interface TopicCluster {
  clusterLabel: string
  keywords: string // JSON string array
  postCount: number
  authorCount: number
  avgSentiment: number // 0-100
}

export interface DiscourseTopology {
  ideologicalCentroid: {x: number; y: number}
  ideologicalSpread: number
  crossCompassEngagement: number
  positionDensity: Record<string, number>
  contestedAxes: ContestedAxis[]
  argumentBalance: {
    claims: number
    evidence: number
    questions: number
    rebuttals: number
  }
  bridgeOpportunities: BridgeOpportunity[]
  proposalVelocity: {
    proposed: number
    deliberating: number
    voting: number
    resolved: number
  }
}

export interface ContestedAxis {
  axisId: string
  axisTitle: string
  labelLow: string
  labelHigh: string
  discourseScore: number
  engagementCount: number
}

export interface BridgeOpportunity {
  description: string
  topicOverlap: string[]
  positionsInvolved: string[]
}

// ─── RAQ ─────────────────────────────────────────────────────────────────────

export const PARA_RAQ_ASSESSMENT_COLLECTION = 'com.para.raq.assessment'
export const PARA_RAQ_AXIS_VOTE_COLLECTION = 'com.para.raq.axisVote'
export const PARA_RAQ_PROPOSAL_COLLECTION = 'com.para.raq.proposal'
export const PARA_RAQ_PROPOSAL_VOTE_COLLECTION = 'com.para.raq.proposalVote'
export const PARA_RAQ_PROPOSAL_ANSWER_COLLECTION = 'com.para.raq.proposalAnswer'

export interface ParaRaqAxisResult {
  axisId: string
  axisTitle: string
  score: number
  label: string
  labelLow?: string
  labelHigh?: string
  rawScore?: number
}

export interface ParaRaqCompassPosition {
  x: number
  y: number
  ninth: string
}

export interface ParaRaqIdeologyMatch {
  name: string
  description: string
  matchPercent: number
}

export interface ParaRaqPartyMatch {
  partyId: string
  partyName: string
  partyFullName?: string
  partyColor?: string
  matchPercent: number
}

export interface ParaRaqAssessmentRecord {
  answers: {questionId: string; value: number}[]
  results: ParaRaqAxisResult[]
  compass: ParaRaqCompassPosition
  ideology: ParaRaqIdeologyMatch
  secondaryIdeology?: ParaRaqIdeologyMatch
  partyMatches?: ParaRaqPartyMatch[]
  isPublic?: boolean
  completedAt: string
  version?: string
}

export interface ParaRaqAxisVoteRecord {
  axisId: string
  value?: number
  voteNullifier?: string
  eligibilityProofRef?: string
  createdAt: string
}

export interface ParaRaqProposalRecord {
  text: string
  targetAxis?: string
  targetCommunity?: string
  createdAt: string
}

export interface ParaRaqProposalVoteRecord {
  subject: string
  value: number
  voteNullifier?: string
  eligibilityProofRef?: string
  createdAt: string
}

export interface ParaRaqProposalAnswerRecord {
  subject: string
  value: number
  createdAt: string
}

export interface ParaRaqProposalView {
  uri: string
  cid: string
  creator: string
  text: string
  targetAxis?: string
  targetCommunity?: string
  upvotes: number
  downvotes: number
  answerCount: number
  answerAverage: number
  viewerUpvote: boolean
  viewerDownvote: boolean
  viewerAnswer: number
  createdAt: string
  indexedAt: string
}

export interface ParaRaqAssessmentView {
  results: ParaRaqAxisResult[]
  compass: ParaRaqCompassPosition
  ideology: ParaRaqIdeologyMatch
  secondaryIdeology?: ParaRaqIdeologyMatch
  partyMatches?: ParaRaqPartyMatch[]
  completedAt?: string
}
