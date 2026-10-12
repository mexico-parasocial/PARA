import {type OutgoingDmRequest} from '#/lib/matrix/directMessages'
import {matchDmIntro} from '#/lib/matrix/dmIntro'

const accepted: OutgoingDmRequest = {
  id: 'req-1',
  recipientDid: 'did:plc:bob',
  status: 'accepted',
  createdAt: '2026-10-10T00:00:00.000Z',
  expiresAt: '2026-10-24T00:00:00.000Z',
}
const pending: OutgoingDmRequest = {
  ...accepted,
  id: 'req-2',
  recipientDid: 'did:plc:carol',
  status: 'pending',
}

describe('matchDmIntro', () => {
  it('matches the accepted request it names, from the DID A asked', () => {
    expect(
      matchDmIntro({requestId: 'req-1', did: 'did:plc:bob'}, [
        accepted,
        pending,
      ]),
    ).toBe(accepted)
  })

  it('refuses a right id with another DID (someone else claiming to be B)', () => {
    expect(
      matchDmIntro({requestId: 'req-1', did: 'did:plc:mallory'}, [accepted]),
    ).toBeUndefined()
  })

  it('refuses a request that is not accepted yet', () => {
    expect(
      matchDmIntro({requestId: 'req-2', did: 'did:plc:carol'}, [pending]),
    ).toBeUndefined()
  })

  it('refuses unknown ids and malformed content', () => {
    expect(
      matchDmIntro({requestId: 'nope', did: 'did:plc:bob'}, [accepted]),
    ).toBeUndefined()
    expect(matchDmIntro(undefined, [accepted])).toBeUndefined()
    expect(matchDmIntro('req-1', [accepted])).toBeUndefined()
    expect(
      matchDmIntro({requestId: 1, did: 'did:plc:bob'}, [accepted]),
    ).toBeUndefined()
  })
})
