import {mapCabildeoPositionsFromRead} from '../../cabildeo-client'
import {type CabildeoServiceAgent, reactToCabildeoPosition} from '../cabildeo'

jest.mock('#/lexicons', () => ({
  com: {
    para: {civic: {}},
    atproto: {repo: {createRecord: 'create'}},
  },
}))

const POSITION = 'at://did:plc:dan/com.para.civic.position/3lpos'
const CABILDEO = 'at://did:plc:alice/com.para.civic.cabildeo/3lcab'

const pds = jest.fn()
const agent = {
  pdsClient: {call: pds},
  session: {did: 'did:plc:bob'},
} as unknown as CabildeoServiceAgent

beforeEach(() => pds.mockReset())

describe('reactToCabildeoPosition', () => {
  it('writes a plain reaction with no m8 proof', async () => {
    await reactToCabildeoPosition(agent, {
      position: POSITION,
      direction: 'agree',
    })
    expect(pds).toHaveBeenCalledTimes(1)
    const [, input] = pds.mock.calls[0]
    expect(input.repo).toBe('did:plc:bob')
    expect(input.collection).toBe('com.para.community.deliberationVote')
    expect(input.record).toMatchObject({
      deliberation: POSITION,
      voter: 'did:plc:bob',
      direction: 'agree',
    })
    // A reaction decides nothing, so it never asks m8 for a proof (OD-7 §5h).
    expect(input.record).not.toHaveProperty('voteNullifier')
    expect(input.record).not.toHaveProperty('eligibilityProofRef')
  })

  it('refuses without a session', async () => {
    const loggedOut = {
      pdsClient: {call: pds},
    } as unknown as CabildeoServiceAgent
    await expect(
      reactToCabildeoPosition(loggedOut, {
        position: POSITION,
        direction: 'pass',
      }),
    ).rejects.toThrow('Not logged in')
    expect(pds).not.toHaveBeenCalled()
  })
})

describe('mapCabildeoPositionsFromRead', () => {
  const read = {
    uri: POSITION,
    cid: 'bafy',
    creator: 'did:plc:dan',
    indexedAt: '2026-11-05T00:00:00.000Z',
    cabildeo: CABILDEO,
    stance: 'question' as const,
    text: '¿Quién paga el mantenimiento?',
    createdAt: '2026-11-05T00:00:00.000Z',
  }

  it('carries the reaction counts and only the viewer own reaction', () => {
    const [position] = mapCabildeoPositionsFromRead([
      {
        ...read,
        agreeCount: 2,
        disagreeCount: 1,
        passCount: 3,
        viewerDirection: 'agree',
      },
    ])
    expect(position).toMatchObject({
      stance: 'question',
      agreeCount: 2,
      disagreeCount: 1,
      passCount: 3,
      viewerDirection: 'agree',
    })
  })

  it('defaults the counts to zero for a server that does not send them', () => {
    const [position] = mapCabildeoPositionsFromRead([read])
    expect(position.agreeCount).toBe(0)
    expect(position.disagreeCount).toBe(0)
    expect(position.passCount).toBe(0)
    expect(position.viewerDirection).toBeUndefined()
  })
})
