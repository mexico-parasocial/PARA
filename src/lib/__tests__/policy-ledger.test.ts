import {
  getPolicyStance,
  selectCurrentPolicyBallots,
  summarizePolicyBallots,
} from '#/lib/policy-ledger'

const REPO = 'at://did:plc:voter/com.para.civic.vote'
const POLICY_A = 'at://did:plc:author/com.para.post/a'
const POLICY_B = 'at://did:plc:author/com.para.post/b'

function ballot(rkey: string, value: Record<string, unknown>) {
  return {uri: `${REPO}/${rkey}`, value}
}

describe('selectCurrentPolicyBallots', () => {
  it('keeps the newest ballot per policy whatever order the PDS lists them in', () => {
    const records = [
      ballot('3aaa', {
        subject: POLICY_A,
        subjectType: 'policy',
        signal: -2,
        createdAt: '2026-10-01T00:00:00.000Z',
      }),
      ballot('3ccc', {
        subject: POLICY_B,
        subjectType: 'policy',
        signal: 0,
        createdAt: '2026-10-03T00:00:00.000Z',
      }),
      ballot('3bbb', {
        subject: POLICY_A,
        subjectType: 'policy',
        signal: 3,
        createdAt: '2026-10-05T00:00:00.000Z',
      }),
    ]
    for (const order of [records, [...records].reverse()]) {
      expect(
        selectCurrentPolicyBallots(order).map(b => [b.policyUri, b.signal]),
      ).toEqual([
        [POLICY_A, 3],
        [POLICY_B, 0],
      ])
    }
  })

  it('falls back to the record key when dates are missing or equal', () => {
    const result = selectCurrentPolicyBallots([
      ballot('3bbb', {subject: POLICY_A, subjectType: 'policy', signal: 1}),
      ballot('3aaa', {subject: POLICY_A, subjectType: 'policy', signal: -1}),
    ])
    expect(result).toHaveLength(1)
    expect(result[0].signal).toBe(1)
  })

  it('skips debate votes and malformed ballots', () => {
    const result = selectCurrentPolicyBallots([
      ballot('1', {
        subject: 'at://did:plc:x/com.para.civic.cabildeo/1',
        subjectType: 'cabildeo',
        selectedOption: 0,
      }),
      ballot('2', {subject: POLICY_A, subjectType: 'policy', signal: 7}),
      ballot('3', {subject: POLICY_A, subjectType: 'policy', signal: 1.5}),
      ballot('4', {subjectType: 'policy', signal: 1}),
      {uri: `${REPO}/5`, value: null},
    ])
    expect(result).toEqual([])
  })
})

describe('summarizePolicyBallots', () => {
  it('counts each side and each weight', () => {
    const summary = summarizePolicyBallots([
      {signal: 3},
      {signal: 1},
      {signal: 0},
      {signal: -3},
    ])
    expect(summary.total).toBe(4)
    expect(summary.stances).toEqual({support: 2, neutral: 1, oppose: 1})
    expect(summary.counts).toEqual([1, 0, 0, 1, 1, 0, 1])
  })

  it('maps signals to stances', () => {
    expect(getPolicyStance(-1)).toBe('oppose')
    expect(getPolicyStance(0)).toBe('neutral')
    expect(getPolicyStance(2)).toBe('support')
  })
})
