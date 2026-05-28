import {type CabildeoView} from '#/lib/cabildeo-client'
import {deriveCivicWeight} from '../mybase-metrics'

function cabildeo(userContext?: CabildeoView['userContext']): CabildeoView {
  return {userContext} as CabildeoView
}

describe('deriveCivicWeight', () => {
  it('returns zeroes with no activity', () => {
    expect(deriveCivicWeight([])).toEqual({
      directPower: 0,
      delegatedPower: 0,
    })
  })

  it('counts direct votes', () => {
    expect(
      deriveCivicWeight([
        cabildeo({viewerVoteOption: 0, viewerVoteIsDirect: true}),
        cabildeo({viewerVoteOption: 1, viewerVoteIsDirect: true}),
      ]),
    ).toEqual({
      directPower: 2,
      delegatedPower: 0,
    })
  })

  it('counts delegated votes and active delegations', () => {
    expect(
      deriveCivicWeight([
        cabildeo({viewerVoteOption: 0, viewerVoteIsDirect: false}),
        cabildeo({hasDelegatedTo: 'did:plc:delegate'}),
        cabildeo({
          delegateVoteEvent: {
            optionIndex: 1,
            votedAt: '2026-05-08T00:00:00.000Z',
            isDismissed: false,
          },
        }),
      ]),
    ).toEqual({
      directPower: 0,
      delegatedPower: 3,
    })
  })

  it('counts mixed vote histories without mock impact fields', () => {
    expect(
      deriveCivicWeight([
        cabildeo({viewerVoteOption: 0, viewerVoteIsDirect: true}),
        cabildeo({viewerVoteOption: 1, viewerVoteIsDirect: false}),
        cabildeo(),
      ]),
    ).toEqual({
      directPower: 1,
      delegatedPower: 1,
    })
  })
})
