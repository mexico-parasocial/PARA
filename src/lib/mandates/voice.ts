/**
 * Voice arithmetic for revocable mandates under quadratic voting.
 * docs/revocable-mandates-spec.md is the specification; this module is its
 * executable part and publishes nothing.
 *
 * A person's ballot on a proposal is a signal from -3 to +3. Its magnitude is
 * their voice (voces) and costs voice² credits. A mandate lends a voice to one
 * delegate. Each lent voice is still priced on its owner's own budget, never
 * pooled, so lending neither creates nor destroys voice.
 */

export const MAX_INTENSITY = 3
export const STANDING_TERM_DAYS = 90
export const DEFAULT_CONCENTRATION_CAP = 0.1

const DAY_MS = 24 * 60 * 60 * 1000

/** Credits a voice of `intensity` costs: 1, 4 or 9. */
export function creditCost(intensity: number): number {
  if (
    !Number.isInteger(intensity) ||
    intensity < 0 ||
    intensity > MAX_INTENSITY
  ) {
    throw new RangeError(`intensity must be an integer 0..${MAX_INTENSITY}`)
  }
  return intensity * intensity
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
  /** Highest voice the delegator lets the delegate spend for them, 1..3. */
  maxIntensity: number
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

/** How many people's voices one delegate may carry in a community. */
export function mandateCap(
  eligibleMembers: number,
  cap = DEFAULT_CONCENTRATION_CAP,
): number {
  return Math.max(1, Math.floor(eligibleMembers * cap))
}

export type LentVoice = {
  delegator: string
  intensity: number
  credits: number
}

export type DelegateVoice = {
  /** The delegate's own voice, 0 if they have not voted. */
  own: number
  /** Voices exercised, oldest mandate first. */
  lent: LentVoice[]
  /** Delegators who voted themselves: their own ballot counts instead. */
  overridden: string[]
  /** Delegators beyond the cap, whose voice goes back to them. */
  returned: string[]
  /** own + Σ lent intensities. */
  voices: number
  /** People whose voice this is: the delegate (if voting) plus lenders. */
  people: number
  /** voices / totalVoices, 0..1. */
  share: number
  capPeople: number
}

export type DelegateVoiceInput = {
  delegate: string
  /** Magnitude of the delegate's own ballot, 0 if they have not voted. */
  delegateIntensity: number
  mandates: readonly Mandate[]
  /** People who cast their own ballot on this proposal. */
  directVoters: ReadonlySet<string>
  proposal: ProposalContext
  eligibleMembers: number
  /** Every voice cast on the proposal, this delegate's included. */
  totalVoices: number
  now: Date
  cap?: number
}

export function delegateVoice(input: DelegateVoiceInput): DelegateVoice {
  const own = input.delegateIntensity
  creditCost(own)
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
  const eligible: Mandate[] = []
  for (const m of governing) {
    if (input.directVoters.has(m.delegator)) overridden.push(m.delegator)
    else eligible.push(m)
  }

  // Nothing is lent to a delegate who has not voted: there is no direction.
  const lent: LentVoice[] =
    own === 0
      ? []
      : eligible.slice(0, capPeople).map(m => {
          const intensity = Math.min(own, clampIntensity(m.maxIntensity))
          return {
            delegator: m.delegator,
            intensity,
            credits: creditCost(intensity),
          }
        })
  const returned =
    own === 0 ? [] : eligible.slice(capPeople).map(m => m.delegator)

  const voices = own + lent.reduce((sum, v) => sum + v.intensity, 0)
  return {
    own,
    lent,
    overridden,
    returned,
    voices,
    people: (own > 0 ? 1 : 0) + lent.length,
    share: input.totalVoices > 0 ? Math.min(1, voices / input.totalVoices) : 0,
    capPeople,
  }
}

function clampIntensity(n: number): number {
  return Math.max(1, Math.min(MAX_INTENSITY, Math.floor(n)))
}

/**
 * What pooling would give instead: √(Σ credits). Kept only so the spec's
 * comparison is executable; the tally never pools.
 */
export function pooledVoices(credits: readonly number[]): number {
  return Math.sqrt(credits.reduce((sum, c) => sum + c, 0))
}
