import {type CabildeoView} from '#/lib/cabildeo-client'

export type CivicWeight = {
  directPower: number
  delegatedPower: number
}

export function deriveCivicWeight(cabildeos: CabildeoView[]): CivicWeight {
  return cabildeos.reduce<CivicWeight>(
    (totals, cabildeo) => {
      const userContext = cabildeo.userContext
      const hasVote = typeof userContext?.viewerVoteOption === 'number'

      if (hasVote && userContext?.viewerVoteIsDirect !== false) {
        totals.directPower += 1
      }

      if (
        (hasVote && userContext?.viewerVoteIsDirect === false) ||
        !!userContext?.hasDelegatedTo ||
        !!userContext?.delegateVoteEvent
      ) {
        totals.delegatedPower += 1
      }

      return totals
    },
    {directPower: 0, delegatedPower: 0},
  )
}
