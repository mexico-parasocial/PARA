import {
  delegateReach,
  type DelegateReachInput,
  governingMandate,
  isValidSignal,
  type Mandate,
  mandateCap,
  mandateIsActive,
  mandateLapsesAt,
  type ProposalContext,
} from '../mandates'

const NOW = new Date('2026-09-29T12:00:00Z')

const proposal: ProposalContext = {
  uri: 'at://did:plc:c/com.para.community.proposal/p1',
  community: 'verde',
  topics: ['energía'],
  delegable: true,
}

let seq = 0
function mandate(over: Partial<Mandate>): Mandate {
  seq++
  return {
    id: `m${seq}`,
    delegator: `did:plc:p${seq}`,
    delegate: 'did:plc:ana',
    kind: 'standing',
    scope: {community: 'verde'},
    grantedAt: `2026-09-${String(10 + (seq % 15)).padStart(2, '0')}T00:00:00Z`,
    ...over,
  }
}

function input(over: Partial<DelegateReachInput>): DelegateReachInput {
  return {
    delegate: 'did:plc:ana',
    delegateVoted: true,
    mandates: [],
    directVoters: new Set(),
    proposal,
    eligibleMembers: 1000,
    totalVotes: 100,
    now: NOW,
    ...over,
  }
}

describe('isValidSignal', () => {
  it('accepts whole signals from -3 to +3 and nothing else', () => {
    expect([-3, -1, 0, 2, 3].every(isValidSignal)).toBe(true)
    expect([4, -4, 1.5, NaN].some(isValidSignal)).toBe(false)
  })
})

describe('mandate lifetime', () => {
  it('lapses a standing mandate 90 days after it was granted', () => {
    const m = mandate({grantedAt: '2026-07-01T00:00:00Z'})
    expect(mandateLapsesAt(m)?.toISOString()).toBe('2026-09-29T00:00:00.000Z')
    expect(mandateIsActive(m, NOW)).toBe(false)
  })

  it('counts the 90 days from the last renewal', () => {
    const m = mandate({
      grantedAt: '2026-07-01T00:00:00Z',
      renewedAt: '2026-09-01T00:00:00Z',
    })
    expect(mandateIsActive(m, NOW)).toBe(true)
  })

  it('never lapses a proposal mandate by time; the proposal closing ends it', () => {
    const m = mandate({
      kind: 'proposal',
      scope: {proposal: proposal.uri},
      grantedAt: '2020-01-01T00:00:00Z',
    })
    expect(mandateLapsesAt(m)).toBeNull()
    expect(mandateIsActive(m, NOW)).toBe(true)
  })

  it('ends at revocation', () => {
    const m = mandate({revokedAt: '2026-09-29T11:59:00Z'})
    expect(mandateIsActive(m, NOW)).toBe(false)
  })
})

describe('governingMandate', () => {
  it('prefers the most specific scope over the most recent', () => {
    const community = mandate({
      delegator: 'did:plc:x',
      grantedAt: '2026-09-20T00:00:00Z',
    })
    const topic = mandate({
      delegator: 'did:plc:x',
      delegate: 'did:plc:luis',
      scope: {community: 'verde', topic: 'energía'},
      grantedAt: '2026-09-01T00:00:00Z',
    })
    expect(
      governingMandate([community, topic], 'did:plc:x', proposal, NOW)?.id,
    ).toBe(topic.id)
  })

  it('prefers the most recent among equally specific mandates', () => {
    const older = mandate({
      delegator: 'did:plc:x',
      grantedAt: '2026-09-01T00:00:00Z',
    })
    const newer = mandate({
      delegator: 'did:plc:x',
      delegate: 'did:plc:luis',
      grantedAt: '2026-09-20T00:00:00Z',
    })
    expect(
      governingMandate([newer, older], 'did:plc:x', proposal, NOW)?.id,
    ).toBe(newer.id)
  })

  it('ignores other communities and other topics', () => {
    const other = mandate({delegator: 'did:plc:x', scope: {community: 'azul'}})
    const topic = mandate({
      delegator: 'did:plc:x',
      scope: {community: 'verde', topic: 'agua'},
    })
    expect(
      governingMandate([other, topic], 'did:plc:x', proposal, NOW),
    ).toBeNull()
  })

  it('never applies to non-delegable subjects', () => {
    const m = mandate({delegator: 'did:plc:x'})
    expect(
      governingMandate([m], 'did:plc:x', {...proposal, delegable: false}, NOW),
    ).toBeNull()
  })
})

describe('delegateReach', () => {
  it('counts the delegate once and each lender once', () => {
    const v = delegateReach(
      input({mandates: [mandate({}), mandate({}), mandate({})]}),
    )
    expect(v.votes).toBe(4)
    expect(v.lent).toHaveLength(3)
    expect(v.share).toBeCloseTo(0.04)
  })

  it('casts nothing lent when the delegate has not voted', () => {
    const v = delegateReach(
      input({delegateVoted: false, mandates: [mandate({}), mandate({})]}),
    )
    expect(v).toMatchObject({votes: 0, lent: [], returned: [], share: 0})
  })

  it("lets a lender's own ballot override the mandate", () => {
    const a = mandate({})
    const b = mandate({})
    const v = delegateReach(
      input({mandates: [a, b], directVoters: new Set([a.delegator])}),
    )
    expect(v.overridden).toEqual([a.delegator])
    expect(v.lent).toEqual([b.delegator])
  })

  it('drops revoked and lapsed mandates', () => {
    const v = delegateReach(
      input({
        mandates: [
          mandate({revokedAt: '2026-09-28T00:00:00Z'}),
          mandate({grantedAt: '2026-06-01T00:00:00Z'}),
          mandate({}),
        ],
      }),
    )
    expect(v.lent).toHaveLength(1)
  })

  it('does not count a mandate the lender has since given to someone else', () => {
    const toAna = mandate({
      delegator: 'did:plc:x',
      grantedAt: '2026-09-01T00:00:00Z',
    })
    const toLuis = mandate({
      delegator: 'did:plc:x',
      delegate: 'did:plc:luis',
      grantedAt: '2026-09-20T00:00:00Z',
    })
    expect(delegateReach(input({mandates: [toAna, toLuis]})).lent).toEqual([])
  })

  it('returns votes beyond the cap to their owners, oldest kept first', () => {
    const mandates = Array.from({length: 5}, (_, i) =>
      mandate({grantedAt: `2026-09-0${i + 1}T00:00:00Z`}),
    )
    const v = delegateReach(input({mandates, eligibleMembers: 30}))
    expect(v.capPeople).toBe(3)
    expect(v.lent).toEqual(mandates.slice(0, 3).map(m => m.delegator))
    expect(v.returned).toEqual(mandates.slice(3).map(m => m.delegator))
    expect(v.votes).toBe(4)
  })

  it('is one hop: votes lent to the delegate do not travel on', () => {
    // Ana lent her own vote to Luis; Luis does not also carry Ana's lenders.
    const anaToLuis = mandate({
      delegator: 'did:plc:ana',
      delegate: 'did:plc:luis',
    })
    const toAna = mandate({})
    const v = delegateReach(
      input({delegate: 'did:plc:luis', mandates: [anaToLuis, toAna]}),
    )
    expect(v.lent).toEqual(['did:plc:ana'])
  })
})

describe('mandateCap', () => {
  it('is 10% of the members, at least one person', () => {
    expect(mandateCap(1000)).toBe(100)
    expect(mandateCap(25)).toBe(2)
    expect(mandateCap(5)).toBe(1)
  })
})
