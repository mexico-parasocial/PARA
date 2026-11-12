import {isPolicySignal} from '#/lib/api/policy-vote'

/** One current policy ballot from a voter's repo. */
export type PolicyBallot = {
  /** The ballot record's own URI. */
  uri: string
  policyUri: string
  signal: number
  createdAt: string
}

export type PolicyStance = 'support' | 'neutral' | 'oppose'

type RepoRecord = {uri: string; value: unknown}

function rkeyOf(uri: string) {
  return uri.slice(uri.lastIndexOf('/') + 1)
}

/**
 * Whether `a` was cast after `b`. Records written by this app carry
 * `createdAt`; record keys are TIDs, which sort by time, so they break ties
 * and cover a missing or unreadable date.
 */
function isNewer(a: PolicyBallot, b: PolicyBallot) {
  const at = Date.parse(a.createdAt)
  const bt = Date.parse(b.createdAt)
  if (Number.isFinite(at) && Number.isFinite(bt) && at !== bt) return at > bt
  return rkeyOf(a.uri) > rkeyOf(b.uri)
}

/**
 * The current ballot on each policy, newest first. Casting again replaces the
 * earlier ballot, but its deletion is best effort, so a repo can still hold
 * several for one policy; only the newest is the voter's stance. Votes on
 * debates and anything malformed are skipped. The order the PDS listed the
 * records in is not trusted.
 */
export function selectCurrentPolicyBallots(
  records: RepoRecord[],
): PolicyBallot[] {
  const byPolicy = new Map<string, PolicyBallot>()
  for (const record of records) {
    const value = record.value as {
      subject?: unknown
      subjectType?: unknown
      signal?: unknown
      createdAt?: unknown
    } | null
    if (
      !value ||
      value.subjectType !== 'policy' ||
      typeof value.subject !== 'string' ||
      typeof value.signal !== 'number' ||
      !isPolicySignal(value.signal)
    ) {
      continue
    }
    const ballot: PolicyBallot = {
      uri: record.uri,
      policyUri: value.subject,
      signal: value.signal,
      createdAt: typeof value.createdAt === 'string' ? value.createdAt : '',
    }
    const previous = byPolicy.get(ballot.policyUri)
    if (!previous || isNewer(ballot, previous)) {
      byPolicy.set(ballot.policyUri, ballot)
    }
  }
  return [...byPolicy.values()].sort((a, b) => (isNewer(a, b) ? -1 : 1))
}

export function getPolicyStance(signal: number): PolicyStance {
  if (signal > 0) return 'support'
  if (signal < 0) return 'oppose'
  return 'neutral'
}

/** How many ballots fall on each side, and on each weight from -3 to +3. */
export function summarizePolicyBallots(
  ballots: Pick<PolicyBallot, 'signal'>[],
) {
  const counts = [0, 0, 0, 0, 0, 0, 0]
  const stances: Record<PolicyStance, number> = {
    support: 0,
    neutral: 0,
    oppose: 0,
  }
  for (const {signal} of ballots) {
    counts[signal + 3] += 1
    stances[getPolicyStance(signal)] += 1
  }
  return {total: ballots.length, counts, stances}
}
