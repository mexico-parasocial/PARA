import {useQuery} from '@tanstack/react-query'

import {
  getGrants,
  type ProofBrokerClaimType,
  type ProofBrokerGrant,
} from '#/lib/m8'

export type CivicEligibility = {
  canVote: boolean
  canPropose: boolean
  isVerifiedPublicFigure: boolean
  isAgeEligible: boolean
  hasPartyAffiliation: boolean
}

export const civicEligibilityQueryKey = ['civic-eligibility']

function hasClaim(
  grants: ProofBrokerGrant[],
  claimType: ProofBrokerClaimType,
): boolean {
  return grants.some(
    g =>
      g.status === 'approved' &&
      g.requestedClaims.some(c => c.type === claimType),
  )
}

function deriveEligibility(grants: ProofBrokerGrant[]): CivicEligibility {
  return {
    canVote:
      hasClaim(grants, 'has_para_verification') ||
      hasClaim(grants, 'is_civic_eligible'),
    canPropose:
      hasClaim(grants, 'has_para_verification') ||
      hasClaim(grants, 'is_civic_eligible'),
    isVerifiedPublicFigure: hasClaim(grants, 'is_verified_public_figure'),
    isAgeEligible: hasClaim(grants, 'is_age_eligible'),
    hasPartyAffiliation:
      hasClaim(grants, 'has_party_affiliation_match') ||
      hasClaim(grants, 'has_continuous_party_membership_30d'),
  }
}

export function useCivicEligibility() {
  return useQuery<CivicEligibility>({
    queryKey: civicEligibilityQueryKey,
    queryFn: async () => {
      const {grants} = await getGrants()
      return deriveEligibility(grants)
    },
  })
}
