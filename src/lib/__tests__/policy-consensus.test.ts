import {describe, expect, it} from '@jest/globals'

import {
  computeDeterministicPolicyTally,
  getCommunityConsensusPermissions,
  getPolicyQuorumTarget,
} from '../policy-consensus'

describe('policy consensus tally', () => {
  it('computes quorum, sum, and average for weighted votes', () => {
    const tally = computeDeterministicPolicyTally({
      signals: [3, 2, 1, 1, 0, -1],
      eligibleVoterCount: 20,
      certified: true,
    })

    expect(tally.totalVotes).toBe(6)
    expect(tally.quorumTarget).toBe(10)
    expect(tally.quorumMet).toBe(false)
    expect(tally.sumSignal).toBe(6)
    expect(tally.averageSignal).toBe(1)
    expect(tally.outcome).toBe('insufficient_quorum')
    expect(tally.state).toBe('draft')
  })

  it('marks a policy as passed once quorum and threshold are met', () => {
    const tally = computeDeterministicPolicyTally({
      signals: [3, 3, 2, 2, 1, 1, 1, 1, 1, 1],
      eligibleVoterCount: 10,
      certified: true,
    })

    expect(tally.quorumMet).toBe(true)
    expect(tally.averageSignal).toBe(1.6)
    expect(tally.outcome).toBe('passed')
    expect(tally.state).toBe('passed')
  })

  it('marks a policy as official when certification and officialization are present', () => {
    const tally = computeDeterministicPolicyTally({
      signals: [3, 3, 3, 3, 2, 2, 2, 2, 1, 1],
      eligibleVoterCount: 10,
      certified: true,
      official: true,
    })

    expect(tally.outcome).toBe('strong_passed')
    expect(tally.state).toBe('official')
  })
})

describe('policy consensus permissions', () => {
  it('treats moderators and officials as certification-capable', () => {
    const permissions = getCommunityConsensusPermissions(
      {
        source: 'network',
        community: 'p/test',
        slug: 'test',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        moderators: [
          {
            did: 'did:plc:mod',
            role: 'Moderator',
            badge: 'Moderator',
            capabilities: [],
          },
        ],
        officials: [
          {
            did: 'did:plc:delegate',
            office: 'Delegate',
            mandate: 'Certify results',
          },
        ],
        deputies: [],
        editHistory: [],
      },
      'did:plc:delegate',
    )

    expect(permissions.roles).toContain('delegate')
    expect(permissions.canVote).toBe(true)
    expect(permissions.canCertify).toBe(true)
    expect(permissions.canMarkOfficial).toBe(true)
  })

  it('keeps baseline quorum rule stable', () => {
    expect(getPolicyQuorumTarget(0)).toBe(10)
    expect(getPolicyQuorumTarget(12)).toBe(10)
    expect(getPolicyQuorumTarget(100)).toBe(20)
  })
})
