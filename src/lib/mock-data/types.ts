// --- Shared/Common Types ---

export interface Author {
  handle: string
  displayName?: string
  avatar?: string
}

// --- Highlights ---

export interface Highlight {
  id: string
  sourcePostUri?: string
  sourcePostCid?: string
  start?: number
  end?: number
  text: string
  postAuthor: string // handle
  authorName: string
  avatarUrl: string
  postPreview: string
  color: string | string[]
  community: string
  state: string
  party?: string // Political party affiliation (e.g., 'Morena', 'PAN', 'PRI')
  createdAt: number // timestamp
  upvotes: number
  downvotes: number
  saves: number
  replyCount?: number
  isVerified: boolean
  isTrending: boolean

  // Viewer state
  viewerHasUpvoted?: boolean
  viewerHasDownvoted?: boolean
  viewerHasSaved?: boolean
}

// --- Representatives ---

export type RepresentativeType = 'Party' | 'Community'
export type RepresentativeStatus = 'unclaimed' | 'verified' | 'retired'
export type RepresentativeAreaScope = {
  type: 'national' | 'state' | 'municipality' | 'district' | 'community'
  label: string
  state?: string
  municipality?: string
  district?: string
  communityUri?: string
}

export interface RepresentativeItem {
  id: string
  did?: string
  name: string
  handle: string
  category: string
  affiliate: string
  state: string
  municipality: string
  avatarColor: string
  type: RepresentativeType
  // Adding optional fields that might be used in UI
  avatar?: string
  description?: string
  followersCount?: number
  followingCount?: number
  postsCount?: number
  status?: RepresentativeStatus
  jurisdiction?: string
  office?: string
  term?: string
  source?: string
  claimContact?: string
  areaScope?: RepresentativeAreaScope
  pajareoCounts?: {
    signatures: number
    questions: number
    signals: number
    testimonials: number
  }
}

// --- Policies / Feed Items ---

export type PolicyType = 'Policy' | 'Matter'
export type PromotedBy = 'Community' | 'Party' | 'Recommended' | 'State'

export interface PolicyItem {
  id: string
  type: PolicyType
  category: string
  title: string
  promotedBy: PromotedBy

  // Optional / Contextual fields
  support?: number // 0-100 or count
  mentions?: number
  match?: number // 0-100
  party?: string
  community?: string
  state?: string
  color?: string
  verified?: boolean
  cabildeoUri?: string
  source?: 'cabildeo' | 'mock'
  phase?: string
  participantCount?: number
  voteCount?: number
  positionCount?: number
}

// --- RAQ (Rapid Answer Questions) ---

export interface OpenQuestion {
  id: string
  text: string
  author: {
    handle: string
    avatar?: string
  }
  replyCount: number
  timestamp: string // e.g. "2h ago"
}

export interface ProposedQuestion {
  id: string
  text: string
  targetCommunity?: string
  upvotes: number
  downvotes: number
  isMainstream: boolean

  // Viewer state
  viewerHasUpvoted?: boolean
  viewerHasDownvoted?: boolean
}

export interface QuestionType {
  id: string
  text: string
}

export interface RAQAxisSection {
  id: string
  title: string
  labelLow: string
  labelHigh: string
  data: QuestionType[]
}

export interface CommunityAxis {
  id: string
  name: string
  description: string
  color: string
  votes: number
  author: string

  // Viewer state
  viewerHasVoted?: boolean
}

// --- Dashboard / VS Screen ---

export interface Party {
  id: string
  name: string
  color: string
  logo: string
}

export interface Topic {
  id: string
  type: PolicyType
  category: string
  title: string
}

// --- Memes and Documents ---

export interface Meme {
  id: string
  type: 'Meme'
  category: string
  title: string
  votes: number
  comments: number
  color: string
  author: string // handle
  community: string
  state: string
  party: string
}

export interface Document {
  id: string
  type: 'Doc'
  category: string
  title: string
  votes: number
  comments: number
  size: string
  date: string
  color: string
  community: string
  state: string
  party: string
}

// --- Voters (Community) ---

export interface VoterVote {
  policyId: string
  policyTitle: string
  vote: number // -3 to 3
}

export interface Voter {
  did: string
  handle: string
  displayName?: string
  avatar?: string
  totalVotes: number
  avgScore: number
  votes: VoterVote[]
}

export interface TopPolicy {
  id: string
  title: string
  votes: number
  percentage: number
  avgScore: number
}

// --- Profile Sections ---

export interface ProfileVote {
  id: string
  title: string
  vote: 'Yes' | 'No' | 'Abstain'
  date: string
}

export interface ProfileRAQ {
  id: string
  question: string
  answer: string
  score: string
}
