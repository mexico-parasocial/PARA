import {type CommunityGovernanceView} from '#/lib/community-governance'

export type WeightedPolicySignal = -3 | -2 | -1 | 0 | 1 | 2 | 3

export type PolicyConsensusRole =
  | 'member'
  | 'verified'
  | 'deputy'
  | 'delegate'
  | 'moderator'

export type PolicyConsensusState =
  | 'draft'
  | 'deliberation'
  | 'voting'
  | 'passed'
  | 'failed'
  | 'official'

export type PolicyConsensusTally = {
  totalVotes: number
  eligibleVoterCount: number
  quorumTarget: number
  quorumMet: boolean
  sumSignal: number
  averageSignal: number
  breakdown: Record<WeightedPolicySignal, number>
  outcome:
    | 'insufficient_quorum'
    | 'passed'
    | 'strong_passed'
    | 'failed'
    | 'contested'
  state: PolicyConsensusState
}

export function computeDeterministicPolicyTally({
  signals,
  eligibleVoterCount,
  certified = false,
  official = false,
}: {
  signals: WeightedPolicySignal[]
  eligibleVoterCount: number
  certified?: boolean
  official?: boolean
}): PolicyConsensusTally {
  const breakdown = createSignalBreakdown()
  let sumSignal = 0

  for (const signal of signals) {
    breakdown[signal] += 1
    sumSignal += signal
  }

  const totalVotes = signals.length
  const quorumTarget = getPolicyQuorumTarget(eligibleVoterCount)
  const quorumMet = totalVotes >= quorumTarget
  const averageSignal = totalVotes > 0 ? sumSignal / totalVotes : 0

  let outcome: PolicyConsensusTally['outcome'] = 'insufficient_quorum'
  if (quorumMet) {
    if (averageSignal >= 2) {
      outcome = 'strong_passed'
    } else if (averageSignal >= 1) {
      outcome = 'passed'
    } else if (averageSignal <= -1) {
      outcome = 'failed'
    } else {
      outcome = 'contested'
    }
  }

  const state = derivePolicyConsensusState({
    outcome,
    certified,
    official,
  })

  return {
    totalVotes,
    eligibleVoterCount,
    quorumTarget,
    quorumMet,
    sumSignal,
    averageSignal,
    breakdown,
    outcome,
    state,
  }
}

export function getPolicyQuorumTarget(eligibleVoterCount: number) {
  const normalizedEligibleCount = Math.max(0, Math.floor(eligibleVoterCount))
  if (normalizedEligibleCount <= 0) {
    return 10
  }
  return Math.max(10, Math.ceil(normalizedEligibleCount * 0.2))
}

export function derivePolicyConsensusState({
  outcome,
  certified,
  official,
}: {
  outcome: PolicyConsensusTally['outcome']
  certified?: boolean
  official?: boolean
}): PolicyConsensusState {
  if (official) {
    return 'official'
  }
  if (outcome === 'failed') {
    return 'failed'
  }
  if (outcome === 'passed' || outcome === 'strong_passed') {
    return certified ? 'passed' : 'voting'
  }
  if (outcome === 'contested') {
    return 'deliberation'
  }
  return 'draft'
}

export function getCommunityConsensusRoles(
  governance: CommunityGovernanceView | null | undefined,
  did: string | undefined,
): PolicyConsensusRole[] {
  if (!did) return []

  const roles = new Set<PolicyConsensusRole>(['member'])
  if (!governance) {
    return Array.from(roles)
  }

  const isModerator = governance.moderators.some(mod => mod.did === did)
  const isDeputy = governance.deputies.some(
    role => role.activeHolder?.did === did,
  )
  const isDelegate = governance.officials.some(rep => rep.did === did)

  if (isModerator) {
    roles.add('moderator')
    roles.add('verified')
  }
  if (isDeputy) {
    roles.add('deputy')
    roles.add('verified')
  }
  if (isDelegate) {
    roles.add('delegate')
    roles.add('verified')
  }

  return Array.from(roles)
}

export function getCommunityConsensusPermissions(
  governance: CommunityGovernanceView | null | undefined,
  did: string | undefined,
) {
  const roles = getCommunityConsensusRoles(governance, did)
  const roleSet = new Set(roles)
  const canVote =
    roleSet.has('verified') ||
    roleSet.has('deputy') ||
    roleSet.has('delegate') ||
    roleSet.has('moderator')
  const canPropose = canVote
  const canCertify = roleSet.has('delegate') || roleSet.has('moderator')
  const canMarkOfficial = canCertify

  return {
    roles,
    canVote,
    canPropose,
    canCertify,
    canMarkOfficial,
  }
}

function createSignalBreakdown(): Record<WeightedPolicySignal, number> {
  return {
    [-3]: 0,
    [-2]: 0,
    [-1]: 0,
    0: 0,
    1: 0,
    2: 0,
    3: 0,
  }
}
