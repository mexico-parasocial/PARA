import {describe, expect, it} from '@jest/globals'

import {
  type CommunityRoleHolder,
  type CommunityRoleOffer,
} from './community-governance'
import {
  incomingOffers,
  offerCandidates,
  outgoingOffers,
} from './community-roles'

const OWNER = 'did:plc:owner'
const ANA = 'did:plc:ana'
const BETO = 'did:plc:beto'

const offer = (
  overrides: Partial<CommunityRoleOffer> = {},
): CommunityRoleOffer => ({
  seq: 4,
  role: 'moderator',
  subject: ANA,
  offeredBy: OWNER,
  expiresAt: '2026-12-01T00:00:00.000Z',
  ...overrides,
})

describe('moderator offers', () => {
  const offers = [offer(), offer({seq: 7, subject: BETO})]

  it('shows a member only the offers addressed to them', () => {
    expect(incomingOffers(offers, ANA).map(o => o.seq)).toEqual([4])
    expect(incomingOffers(offers, OWNER)).toEqual([])
    expect(incomingOffers(offers, undefined)).toEqual([])
  })

  it('shows an owner the offers they made', () => {
    expect(outgoingOffers(offers, OWNER).map(o => o.seq)).toEqual([4, 7])
    expect(outgoingOffers(offers, ANA)).toEqual([])
    expect(outgoingOffers(offers, undefined)).toEqual([])
  })

  it('offers the role only to members without office or a pending offer', () => {
    const holders: CommunityRoleHolder[] = [
      {did: OWNER, role: 'owner'},
      {did: 'did:plc:mod', role: 'moderator'},
    ]
    const members = [OWNER, 'did:plc:mod', ANA, BETO, 'did:plc:caro'].map(
      did => ({did}),
    )
    expect(
      offerCandidates(members, {
        holders,
        offers: [offer()],
        viewerDid: OWNER,
      }).map(m => m.did),
    ).toEqual([BETO, 'did:plc:caro'])
  })
})
