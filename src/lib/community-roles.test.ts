import {
  type CommunityRoleHolder,
  type CommunityRoleOffer,
} from '#/lib/community-governance'
import {
  buildModeratorAppointment,
  buildModeratorResignation,
  buildModeratorRevocation,
  buildRoleAcceptance,
  buildRoleOffer,
  incomingOffers,
  offerCandidates,
  outgoingOffers,
} from './community-roles'

const BOARD = 'at://did:plc:owner/com.para.community.board/b1'
const OWNER = 'did:plc:owner'
const MEMBER = 'did:plc:member'
const NOW = new Date('2026-11-07T12:00:00Z')

const offer = (over: Partial<CommunityRoleOffer> = {}): CommunityRoleOffer => ({
  uri: 'at://did:plc:owner/com.para.community.roleOffer/o1',
  role: 'moderator',
  subject: MEMBER,
  offeredBy: OWNER,
  createdAt: '2026-11-07T10:00:00Z',
  subjectEventUri: 'at://did:plc:member/com.para.community.authorityEvent/e1',
  subjectEventVersion: 1,
  ...over,
})

const holder = (
  over: Partial<CommunityRoleHolder> = {},
): CommunityRoleHolder => ({
  did: MEMBER,
  role: 'moderator',
  evidence: 'at://did:plc:member/com.para.community.roleAcceptance/a1',
  eventUri: 'at://did:plc:owner/com.para.community.authorityEvent/g1',
  eventVersion: 2,
  ...over,
})

describe('the three records of an appointment', () => {
  it('offers the moderator role to a member', () => {
    expect(
      buildRoleOffer({community: BOARD, subject: MEMBER, now: NOW}),
    ).toEqual({
      $type: 'com.para.community.roleOffer',
      community: BOARD,
      role: 'moderator',
      subject: MEMBER,
      createdAt: NOW.toISOString(),
    })
  })

  it('accepts only an offer addressed to the member', () => {
    expect(
      buildRoleAcceptance({
        community: BOARD,
        offer: offer(),
        subject: MEMBER,
        now: NOW,
      }),
    ).toMatchObject({offer: offer().uri, subject: MEMBER, role: 'moderator'})
    expect(() =>
      buildRoleAcceptance({
        community: BOARD,
        offer: offer(),
        subject: 'did:plc:other',
        now: NOW,
      }),
    ).toThrow()
  })

  it('appoints by citing the acceptance and chaining to the member’s last event', () => {
    const accepted = offer({
      acceptanceUri: 'at://did:plc:member/com.para.community.roleAcceptance/a1',
    })
    expect(
      buildModeratorAppointment({
        community: BOARD,
        issuer: OWNER,
        offer: accepted,
        now: NOW,
      }),
    ).toEqual({
      $type: 'com.para.community.authorityEvent',
      community: BOARD,
      subject: MEMBER,
      action: 'moderator.grant',
      issuer: OWNER,
      effectiveAt: NOW.toISOString(),
      predecessor: accepted.subjectEventUri,
      version: 2,
      basis: 'ownerAppointment',
      evidence: accepted.acceptanceUri,
      createdAt: NOW.toISOString(),
    })
  })

  it('does not appoint before the member accepted, or for another owner’s offer', () => {
    expect(() =>
      buildModeratorAppointment({
        community: BOARD,
        issuer: OWNER,
        offer: offer(),
      }),
    ).toThrow()
    expect(() =>
      buildModeratorAppointment({
        community: BOARD,
        issuer: 'did:plc:someone-else',
        offer: offer({acceptanceUri: 'at://x/y/z'}),
      }),
    ).toThrow()
  })
})

describe('stepping down and revoking', () => {
  it('lets a moderator resign, chaining to their latest event', () => {
    expect(
      buildModeratorResignation({community: BOARD, holder: holder(), now: NOW}),
    ).toMatchObject({
      action: 'moderator.resign',
      subject: MEMBER,
      issuer: MEMBER,
      basis: 'resignation',
      predecessor: holder().eventUri,
      version: 3,
    })
  })

  it('has the owner revoke with the evidence of the appointment', () => {
    expect(
      buildModeratorRevocation({
        community: BOARD,
        issuer: OWNER,
        holder: holder(),
        now: NOW,
      }),
    ).toMatchObject({
      action: 'moderator.revoke',
      subject: MEMBER,
      issuer: OWNER,
      basis: 'ownerAppointment',
      evidence: holder().evidence,
      version: 3,
    })
  })

  it('refuses to build an event it cannot chain', () => {
    expect(() =>
      buildModeratorResignation({
        community: BOARD,
        holder: holder({eventUri: undefined}),
      }),
    ).toThrow()
    expect(() =>
      buildModeratorRevocation({
        community: BOARD,
        issuer: OWNER,
        holder: holder({evidence: undefined}),
      }),
    ).toThrow()
  })
})

describe('who sees what', () => {
  const waiting = offer()
  const accepted = offer({
    uri: 'at://did:plc:owner/com.para.community.roleOffer/o2',
    subject: 'did:plc:two',
    acceptanceUri: 'at://x/y/a2',
  })

  it('lists offers for the member that they have not answered', () => {
    expect(incomingOffers([waiting, accepted], MEMBER)).toEqual([waiting])
    expect(incomingOffers([waiting, accepted], undefined)).toEqual([])
  })

  it('splits the owner’s offers by whether the member answered', () => {
    expect(outgoingOffers([waiting, accepted], OWNER)).toEqual({
      waiting: [waiting],
      accepted: [accepted],
    })
    expect(outgoingOffers([waiting, accepted], 'did:plc:other')).toEqual({
      waiting: [],
      accepted: [],
    })
  })

  it('offers the role only to members without office or a pending offer', () => {
    const members = [
      {did: OWNER},
      {did: MEMBER},
      {did: 'did:plc:two'},
      {did: 'did:plc:three'},
      {did: 'did:plc:four'},
    ]
    const candidates = offerCandidates(members, {
      viewerDid: OWNER,
      holders: [holder({did: 'did:plc:three'})],
      offers: [waiting, accepted],
    })
    expect(candidates.map(c => c.did)).toEqual(['did:plc:four'])
  })
})
