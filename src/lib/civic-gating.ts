import {type CivicEligibility} from '#/state/queries/civic-eligibility'

export function requireCivicProof(
  eligibility: CivicEligibility | undefined,
  isLoading: boolean,
  openDialog: () => void,
): boolean {
  if (isLoading) return false
  const canVote = eligibility?.canVote ?? false
  if (!canVote) {
    openDialog()
    return false
  }
  return true
}

export function requirePublicFigureProof(
  eligibility: CivicEligibility | undefined,
  isLoading: boolean,
  openDialog: () => void,
): boolean {
  if (isLoading) return false
  const isVerifiedPublicFigure = eligibility?.isVerifiedPublicFigure ?? false
  if (!isVerifiedPublicFigure) {
    openDialog()
    return false
  }
  return true
}
