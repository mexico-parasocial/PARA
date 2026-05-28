// ─────────────────────────────────────────────────────────────────────────────
// PARA Civic Acuerdo + Voto Bloqueado Lexicon
// ─────────────────────────────────────────────────────────────────────────────

/**
 * com.para.civic.acuerdo
 *
 * An acuerdo is a binding coalition that locks member votes on specific
 * policies or representative elections. Admins control visibility.
 */
export interface AcuerdoRecord {
  // Core
  title: string
  description: string
  createdAt: string // ISO timestamp
  author: string // DID

  // Scope — what this acuerdo covers
  scope: {
    type: 'policy' | 'election' | 'multi'
    subjects: string[] // URIs of policies or elections
  }

  // Visibility — set by admins
  visibility: 'public' | 'private'

  // Governance
  admins: string[] // DIDs with admin power
  minLockQuorum: number // Minimum locked votes to activate

  // Delegation chain
  delegateTo?: string // DID of representative this acuerdo delegates to
  parentAcuerdo?: string // URI of larger acuerdo this one is nested under

  // Lifecycle
  phase: 'forming' | 'active' | 'locked' | 'resolved' | 'cancelled'
  lockDeadline?: string // When votes must be locked by
  resolveDeadline?: string // When the vote happens

  // Outcome (filled when resolved)
  outcome?: {
    winningOption: number
    totalLockedVotes: number
    directVotes: number
    delegatedVotes: number
  }
}

/**
 * com.para.civic.acuerdo.lock
 *
 * Individual voter's lock-in to an acuerdo.
 */
export interface AcuerdoLockRecord {
  acuerdo: string // URI of the acuerdo
  voter: string // DID of the locking voter
  lockedAt: string
  expiresAt: string | null // null = until acuerdo resolves

  // What the voter is committing
  commitment: {
    type: 'follow-acuerdo' | 'delegate-to-rep'
    // follow: voter automatically votes with acuerdo's decision
    // delegate: voter delegates their vote power to acuerdo's chosen rep
  }

  // Exit tracking
  exitRequestedAt?: string
  exitCooldownEndsAt?: string // 48h from request
}

/**
 * com.para.civic.acuerdo.signatory
 *
 * Representative or organization signing a public acuerdo commitment.
 */
export interface AcuerdoSignatoryRecord {
  acuerdo: string
  signatory: string // DID
  signedAt: string
  role: 'representative' | 'community-delegate' | 'organization'

  // Milestone commitments
  milestones: Array<{
    id: string
    description: string
    deadline: string
    status: 'pending' | 'in-progress' | 'completed' | 'blocked'
    evidenceUri?: string // Link to proof of completion
  }>
}

/**
 * com.para.civic.acuerdo.milestone.update
 *
 * Status update on a signatory milestone.
 */
export interface MilestoneUpdateRecord {
  acuerdo: string
  signatory: string
  milestoneId: string
  updatedAt: string
  newStatus: 'pending' | 'in-progress' | 'completed' | 'blocked'
  evidenceUri?: string
  note?: string
}
