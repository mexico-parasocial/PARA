import {
  creditCost,
  delegateVoice,
  type DelegateVoiceInput,
  governingMandate,
  type Mandate,
  mandateCap,
  mandateIsActive,
  mandateLapsesAt,
  pooledVoices,
  type ProposalContext,
} from '../voice'

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
    maxIntensity: 1,
    grantedAt: `2026-09-${String(10 + (seq % 15)).padStart(2, '0')}T00:00:00Z`,
    ...over,
  }
}

function input(over: Partial<DelegateVoiceInput>): DelegateVoiceInput {
  return {
    delegate: 'did:plc:ana',
    delegateIntensity: 1,
    mandates: [],
    directVoters: new Set(),
    proposal,
    eligibleMembers: 1000,
    totalVoices: 100,
    now: NOW,
    ...over,
  }
}

describe('creditCost', () => {
  it('is the square of the voice', () => {
    expect([0, 1, 2, 3].map(creditCost)).toEqual([0, 1, 4, 9])
  })

  it('refuses voices outside 0..3', () => {
    expect(() => creditCost(4)).toThrow(RangeError)
    expect(() => creditCost(-1)).toThrow(RangeError)
    expect(() => creditCost(1.5)).toThrow(RangeError)
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

  it('never applies to non-delegable proposals', () => {
    const m = mandate({delegator: 'did:plc:x'})
    expect(
      governingMandate([m], 'did:plc:x', {...proposal, delegable: false}, NOW),
    ).toBeNull()
  })
})

describe('delegateVoice', () => {
  it('counts each lender once, at the voice they authorised', () => {
    const mandates = [
      mandate({maxIntensity: 1}),
      mandate({maxIntensity: 3}),
      mandate({maxIntensity: 2}),
    ]
    const v = delegateVoice(input({delegateIntensity: 3, mandates}))
    expect(v.own).toBe(3)
    expect(v.lent.map(l => l.intensity).sort()).toEqual([1, 2, 3])
    expect(v.lent.map(l => l.credits).sort((a, b) => a - b)).toEqual([1, 4, 9])
    expect(v.voices).toBe(9)
    expect(v.people).toBe(4)
    expect(v.share).toBeCloseTo(0.09)
  })

  it('never lends more voice than the delegate casts', () => {
    const v = delegateVoice(
      input({delegateIntensity: 1, mandates: [mandate({maxIntensity: 3})]}),
    )
    expect(v.lent[0]).toMatchObject({intensity: 1, credits: 1})
  })

  it('counts nothing lent when the delegate has not voted', () => {
    const v = delegateVoice(
      input({delegateIntensity: 0, mandates: [mandate({}), mandate({})]}),
    )
    expect(v).toMatchObject({voices: 0, people: 0, lent: [], returned: []})
  })

  it("lets a lender's own ballot override the mandate", () => {
    const a = mandate({})
    const b = mandate({})
    const v = delegateVoice(
      input({mandates: [a, b], directVoters: new Set([a.delegator])}),
    )
    expect(v.overridden).toEqual([a.delegator])
    expect(v.lent.map(l => l.delegator)).toEqual([b.delegator])
  })

  it('drops revoked and lapsed mandates', () => {
    const v = delegateVoice(
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
    const v = delegateVoice(input({mandates: [toAna, toLuis]}))
    expect(v.lent).toHaveLength(0)
  })

  it('returns voices beyond the cap to their owners, oldest kept first', () => {
    const mandates = Array.from({length: 5}, (_, i) =>
      mandate({grantedAt: `2026-09-0${i + 1}T00:00:00Z`}),
    )
    const v = delegateVoice(input({mandates, eligibleMembers: 30}))
    expect(v.capPeople).toBe(3)
    expect(v.lent.map(l => l.delegator)).toEqual(
      mandates.slice(0, 3).map(m => m.delegator),
    )
    expect(v.returned).toEqual(mandates.slice(3).map(m => m.delegator))
  })

  it('is one hop: voices lent to the delegate do not travel on', () => {
    // Ana lent her own voice to Luis; Luis's voice does not include Ana's lenders.
    const anaToLuis = mandate({
      delegator: 'did:plc:ana',
      delegate: 'did:plc:luis',
    })
    const toAna = mandate({})
    const v = delegateVoice(
      input({delegate: 'did:plc:luis', mandates: [anaToLuis, toAna]}),
    )
    expect(v.lent.map(l => l.delegator)).toEqual(['did:plc:ana'])
  })
})

describe('mandateCap', () => {
  it('is 10% of the members, at least one person', () => {
    expect(mandateCap(1000)).toBe(100)
    expect(mandateCap(25)).toBe(2)
    expect(mandateCap(5)).toBe(1)
  })
})

describe('why voices are not pooled', () => {
  it('pooling 25 lenders at voice 3 would shrink them from 75 voices to 15', () => {
    const credits = Array.from({length: 25}, () => creditCost(3))
    expect(25 * 3).toBe(75)
    expect(pooledVoices(credits)).toBe(15)
  })
})
