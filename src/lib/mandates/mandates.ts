/**
 * Revocable mandates: who a lent vote counts for, and how far one delegate
 * reaches. docs/revocable-mandates-spec.md is the specification; this module
 * is its executable part and publishes nothing.
 *
 * There are no credits. A policy ballot is a signal from -3 to +3; a cabildeo
 * ballot is one option, unweighted. A lent vote casts the delegate's ballot
 * once for the person who lent it, so lending neither adds votes nor removes
 * them.
 */

export const MAX_SIGNAL = 3
export const STANDING_TERM_DAYS = 90
export const DEFAULT_CONCENTRATION_CAP = 0.1

const DAY_MS = 24 * 60 * 60 * 1000

/** What a subject takes: a weighted signal (policy) or one option (cabildeo). */
export type BallotKind = 'policy' | 'cabildeo'

/** A policy signal is an integer from -3 to +3. */
export function isValidSignal(signal: number): boolean {
  return (
    Number.isInteger(signal) && signal >= -MAX_SIGNAL && signal <= MAX_SIGNAL
  )
}

export type MandateScope = {
  proposal?: string
  topic?: string
  community?: string
}

export type Mandate = {
  id: string
  delegator: string
  delegate: string
  /** `proposal`: one proposal, ends when it closes. `standing`: renewable. */
  kind: 'proposal' | 'standing'
  scope: MandateScope
  grantedAt: string
  renewedAt?: string
  revokedAt?: string
}

export type ProposalContext = {
  uri: string
  community: string
  topics: readonly string[]
  /** False for elections, rotations and config or constitution changes. */
  delegable: boolean
}

/** When a standing mandate lapses unless renewed; null for proposal mandates. */
export function mandateLapsesAt(m: Mandate): Date | null {
  if (m.kind !== 'standing') return null
  const start = new Date(m.renewedAt ?? m.grantedAt).getTime()
  return new Date(start + STANDING_TERM_DAYS * DAY_MS)
}

export function mandateIsActive(m: Mandate, now: Date): boolean {
  if (m.revokedAt && new Date(m.revokedAt) <= now) return false
  const lapses = mandateLapsesAt(m)
  return lapses === null || lapses > now
}

/** 3 for a named proposal, 2 for a topic, 1 for a whole community, 0 if none. */
export function mandateSpecificity(m: Mandate, p: ProposalContext): number {
  if (!p.delegable) return 0
  if (m.scope.proposal) return m.scope.proposal === p.uri ? 3 : 0
  if (m.kind !== 'standing' || m.scope.community !== p.community) return 0
  if (m.scope.topic) return p.topics.includes(m.scope.topic) ? 2 : 0
  return 1
}

/**
 * The one mandate that speaks for `delegator` on `p`: the most specific
 * active one, then the most recently granted. Null if none applies.
 */
export function governingMandate(
  mandates: readonly Mandate[],
  delegator: string,
  p: ProposalContext,
  now: Date,
): Mandate | null {
  let best: Mandate | null = null
  let bestSpecificity = 0
  for (const m of mandates) {
    if (m.delegator !== delegator || !mandateIsActive(m, now)) continue
    const s = mandateSpecificity(m, p)
    if (s === 0) continue
    if (
      s > bestSpecificity ||
      (s === bestSpecificity && best && m.grantedAt > best.grantedAt)
    ) {
      best = m
      bestSpecificity = s
    }
  }
  return best
}

/** How many people's votes one delegate may carry in a community. */
export function mandateCap(
  eligibleMembers: number,
  cap = DEFAULT_CONCENTRATION_CAP,
): number {
  return Math.max(1, Math.floor(eligibleMembers * cap))
}

export type DelegateReach = {
  /** Whether the delegate has cast their own ballot. */
  voted: boolean
  /** Lenders whose vote this ballot casts, oldest mandate first. */
  lent: string[]
  /** Lenders who voted themselves: their own ballot counts instead. */
  overridden: string[]
  /** Lenders beyond the cap, whose vote goes back to them. */
  returned: string[]
  /** Ballots this delegate's choice decides: their own plus the lent ones. */
  votes: number
  /** votes / totalVotes, 0..1. */
  share: number
  capPeople: number
}

export type DelegateReachInput = {
  delegate: string
  /** Whether the delegate has voted on this subject. */
  delegateVoted: boolean
  mandates: readonly Mandate[]
  /** People who cast their own ballot on this subject. */
  directVoters: ReadonlySet<string>
  proposal: ProposalContext
  eligibleMembers: number
  /** Every ballot counted on the subject, direct and lent. */
  totalVotes: number
  now: Date
  cap?: number
}

export function delegateReach(input: DelegateReachInput): DelegateReach {
  const capPeople = mandateCap(input.eligibleMembers, input.cap)

  const delegators = new Set(
    input.mandates
      .filter(m => m.delegate === input.delegate)
      .map(m => m.delegator),
  )
  const governing: Mandate[] = []
  for (const delegator of delegators) {
    if (delegator === input.delegate) continue
    const m = governingMandate(
      input.mandates,
      delegator,
      input.proposal,
      input.now,
    )
    if (m?.delegate === input.delegate) governing.push(m)
  }
  governing.sort((x, y) => x.grantedAt.localeCompare(y.grantedAt))

  const overridden: string[] = []
  const eligible: string[] = []
  for (const m of governing) {
    if (input.directVoters.has(m.delegator)) overridden.push(m.delegator)
    else eligible.push(m.delegator)
  }

  // A delegate who has not voted casts nothing: there is no ballot to copy.
  const voted = input.delegateVoted
  const lent = voted ? eligible.slice(0, capPeople) : []
  const returned = voted ? eligible.slice(capPeople) : []
  const votes = (voted ? 1 : 0) + lent.length

  return {
    voted,
    lent,
    overridden,
    returned,
    votes,
    share: input.totalVotes > 0 ? Math.min(1, votes / input.totalVotes) : 0,
    capPeople,
  }
}
