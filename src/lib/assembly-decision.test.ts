import {type AssemblyDecisionReadView} from '#/lib/api/cabildeo'
import {
  assemblyDecisionState,
  assemblyDraftProblem,
  assemblyProblemText,
  buildAssemblyDecisionEvent,
  isBoardUri,
  isDid,
  protectedActionFor,
} from '#/lib/assembly-decision'

const BOARD = 'at://did:plc:alice/com.para.community.profile/self'
const SUBJECT = 'did:plc:applicant'
const CABILDEO = 'at://did:plc:alice/com.para.civic.cabildeo/3kcab'

const outcome = {
  approved: true,
  reason: 'approved',
  electorate: 3,
  quorumTarget: 3,
  participants: 3,
  approvals: 2,
  rejections: 1,
}

describe('draft validation', () => {
  it('needs a board URI, not a slug or a name', () => {
    expect(isBoardUri(BOARD)).toBe(true)
    expect(isBoardUri('p/Jalisco')).toBe(false)
    expect(isBoardUri('at://did:plc:alice/app.bsky.feed.post/3k')).toBe(false)
    expect(isBoardUri(`${BOARD}/`)).toBe(false)
  })

  it('needs a DID for the subject', () => {
    expect(isDid(SUBJECT)).toBe(true)
    expect(isDid('alice.example.com')).toBe(false)
    expect(isDid('did:plc:')).toBe(false)
  })

  it('reports the first thing missing', () => {
    expect(assemblyDraftProblem({community: 'p/x', subject: SUBJECT})).toBe(
      'community',
    )
    expect(assemblyDraftProblem({community: BOARD, subject: 'nope'})).toBe(
      'subject',
    )
    expect(assemblyDraftProblem({community: BOARD, subject: SUBJECT})).toBe(
      null,
    )
  })

  it('trims the subject of the claim', () => {
    expect(protectedActionFor('membership.approve', ` ${SUBJECT} `)).toEqual({
      action: 'membership.approve',
      subject: SUBJECT,
    })
  })
})

describe('what a viewer can do with a resolved decision', () => {
  const event = {
    action: 'member.activate',
    subject: SUBJECT,
    version: 1,
    evidence: CABILDEO,
  }
  const state = (d: AssemblyDecisionReadView) => assemblyDecisionState(d).kind

  it('publishes only what the AppView offers', () => {
    expect(state({outcome, event})).toBe('publishable')
    expect(state({outcome: {...outcome, approved: false}})).toBe('rejected')
  })

  it('shows a spent vote as applied, and a refused one as invalid', () => {
    expect(state({outcome, appliedEvent: 'at://x/y/z'})).toBe('applied')
    expect(state({problem: 'wrong-community'})).toBe('invalid')
    expect(state({outcome, problem: 'not-admissible'})).toBe('invalid')
  })
})

describe('the authority event', () => {
  const now = new Date('2026-11-06T12:00:00.000Z')

  it('chains to the subject and cites the cabildeo', () => {
    expect(
      buildAssemblyDecisionEvent({
        community: BOARD,
        issuer: 'did:plc:bob',
        now,
        decision: {
          outcome,
          event: {
            action: 'owner.revoke',
            subject: SUBJECT,
            version: 3,
            predecessor:
              'at://did:plc:alice/com.para.community.authorityEvent/2',
            evidence: CABILDEO,
          },
        },
      }),
    ).toEqual({
      $type: 'com.para.community.authorityEvent',
      community: BOARD,
      subject: SUBJECT,
      action: 'owner.revoke',
      issuer: 'did:plc:bob',
      effectiveAt: now.toISOString(),
      version: 3,
      predecessor: 'at://did:plc:alice/com.para.community.authorityEvent/2',
      basis: 'assemblyDecision',
      evidence: CABILDEO,
      createdAt: now.toISOString(),
    })
  })

  it('omits the predecessor of a first event', () => {
    const record = buildAssemblyDecisionEvent({
      community: BOARD,
      issuer: 'did:plc:bob',
      now,
      decision: {
        outcome,
        event: {
          action: 'member.activate',
          subject: SUBJECT,
          version: 1,
          evidence: CABILDEO,
        },
      },
    })
    expect('predecessor' in record).toBe(false)
  })

  it('refuses to build an event the AppView did not offer', () => {
    expect(() =>
      buildAssemblyDecisionEvent({
        community: BOARD,
        issuer: 'did:plc:bob',
        decision: {outcome: {...outcome, approved: false}},
      }),
    ).toThrow()
  })

  it('explains a vote that was open too briefly', () => {
    expect(assemblyDecisionState({problem: 'too-short'})).toEqual({
      kind: 'invalid',
      problem: 'too-short',
    })
    expect(assemblyProblemText('too-short')).toContain('72 horas')
  })
})
