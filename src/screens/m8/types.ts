import {type ProofBrokerClaimType, type ProofBrokerGrant} from '#/lib/m8'

export type IdentityContextId = 'public' | 'anonymous' | 'isolated'

export type IdentityContext = {
  id: IdentityContextId
  label: string
  handle: string
  displayName: string
  avatarSeed?: string
  isActive: boolean
  isAvailable: boolean
  description: string
}

export type CivicCapability = {
  id: string
  label: string
  detail: string
  enabled: boolean
  icon?: 'vote' | 'propose' | 'verify' | 'age' | 'district' | 'default'
}

export type ConnectedAccount = {
  id: string
  provider: 'bsky' | 'x' | 'instagram'
  handle: string
  linkedAt: string
}

export type PrivacyClaim = {
  id: string
  label: string
  detail: string
  disclosed: boolean
}

export function claimTypeToLabel(type: ProofBrokerClaimType): string {
  switch (type) {
    case 'is_verified_public_figure':
      return 'Verified public figure'
    case 'is_civic_eligible':
      return 'Civic eligibility'
    case 'has_para_verification':
      return 'PARA verification'
    case 'has_party_affiliation_match':
      return 'Party affiliation'
    case 'joined_during_founding_period':
      return 'Founding member'
    case 'has_continuous_party_membership_30d':
      return '30-day membership'
    case 'is_age_eligible':
      return 'Age eligible'
    case 'has_backup_coverage':
      return 'Backup coverage'
    default:
      return type
  }
}

export function deriveCapabilitiesFromGrants(
  grants: ProofBrokerGrant[],
): CivicCapability[] {
  const active = grants.filter(g => g.status === 'approved')
  const claimSet = new Set(
    active.flatMap(g => g.requestedClaims.map(c => c.type)),
  )

  return [
    {
      id: 'vote',
      label: 'Vote',
      detail: 'Cast one vote per civic issue across all your identities',
      enabled:
        claimSet.has('has_para_verification') ||
        claimSet.has('is_civic_eligible'),
      icon: 'vote',
    },
    {
      id: 'propose',
      label: 'Propose policies',
      detail: 'Create cabildeos and community proposals',
      enabled:
        claimSet.has('has_para_verification') ||
        claimSet.has('is_civic_eligible'),
      icon: 'propose',
    },
    {
      id: 'public_figure',
      label: 'Public-figure profile',
      detail: 'Appear as a verified public figure',
      enabled: claimSet.has('is_verified_public_figure'),
      icon: 'verify',
    },
    {
      id: 'age',
      label: 'Age-gated actions',
      detail: 'Access content restricted to adults',
      enabled: claimSet.has('is_age_eligible'),
      icon: 'age',
    },
    {
      id: 'party',
      label: 'Party-affiliation matching',
      detail: 'Participate in partisan spaces',
      enabled:
        claimSet.has('has_party_affiliation_match') ||
        claimSet.has('has_continuous_party_membership_30d'),
      icon: 'district',
    },
  ]
}

export function derivePrivacyClaimsFromGrants(
  grants: ProofBrokerGrant[],
): PrivacyClaim[] {
  const active = grants.filter(g => g.status === 'approved')
  const seen = new Map<ProofBrokerClaimType, PrivacyClaim>()

  for (const grant of active) {
    for (const claim of grant.requestedClaims) {
      if (!seen.has(claim.type)) {
        seen.set(claim.type, {
          id: claim.type,
          label: claimTypeToLabel(claim.type),
          detail: `Shared with ${grant.appName}`,
          disclosed: claim.disclosure !== 'proof-only',
        })
      }
    }
  }

  return Array.from(seen.values())
}

export function getVotingPowerSummary(grants: ProofBrokerGrant[]): {
  hasVote: boolean
  detail: string
} {
  const active = grants.filter(g => g.status === 'approved')
  const canVote = active.some(g =>
    g.requestedClaims.some(
      c => c.type === 'is_civic_eligible' || c.type === 'has_para_verification',
    ),
  )
  return {
    hasVote: canVote,
    detail: canVote
      ? 'Your verified identity gives you 1 vote in civic actions'
      : 'Complete verification to unlock your vote',
  }
}
