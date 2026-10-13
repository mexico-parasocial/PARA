import {type OutgoingDmRequest} from '#/lib/matrix/directMessages'
import {dmIntroMessage, parseDmIntroBody} from '#/lib/matrix/dmIntro'
import {reconcileDirectInvites} from '#/lib/matrix/dmRooms'

const accepted = (id: string, did: string): OutgoingDmRequest => ({
  id,
  recipientDid: did,
  status: 'accepted',
  createdAt: '2026-10-10T00:00:00.000Z',
  expiresAt: '2026-10-24T00:00:00.000Z',
})

function deps(intros: Record<string, unknown>) {
  const calls = {
    left: [] as string[],
    remembered: [] as unknown[],
    dismissed: [] as string[],
    read: [] as string[],
  }
  return {
    calls,
    deps: {
      readIntro: async (roomId: string) => {
        calls.read.push(roomId)
        return intros[roomId]
      },
      leave: async (roomId: string) => {
        calls.left.push(roomId)
      },
      remember: async (room: unknown) => {
        calls.remembered.push(room)
      },
      dismissRequest: async (id: string) => {
        calls.dismissed.push(id)
      },
    },
  }
}

describe('dm intro message', () => {
  it('round-trips through the message body', () => {
    const msg = dmIntroMessage({requestId: 'r1', did: 'did:plc:bob'})
    expect(msg.msgtype).toBe('com.para.dm.intro')
    expect(parseDmIntroBody(msg.body)).toEqual({
      requestId: 'r1',
      did: 'did:plc:bob',
    })
    expect(parseDmIntroBody('not json')).toBeUndefined()
    expect(parseDmIntroBody('{"requestId":1}')).toBeUndefined()
  })
})

describe('reconcileDirectInvites', () => {
  it('keeps the room whose intro answers an accepted request, and dismisses it', async () => {
    const {calls, deps: d} = deps({'!b': {requestId: 'r1', did: 'did:plc:bob'}})
    const result = await reconcileDirectInvites(
      [{roomId: '!b'}],
      [accepted('r1', 'did:plc:bob')],
      d,
    )
    expect(result.verified).toEqual([{roomId: '!b', did: 'did:plc:bob'}])
    expect(calls.remembered).toEqual([{roomId: '!b', did: 'did:plc:bob'}])
    expect(calls.dismissed).toEqual(['r1'])
    expect(calls.left).toEqual([])
  })

  it('leaves an invite that claims the right id with another DID', async () => {
    const {calls, deps: d} = deps({
      '!x': {requestId: 'r1', did: 'did:plc:mallory'},
    })
    const result = await reconcileDirectInvites(
      [{roomId: '!x'}],
      [accepted('r1', 'did:plc:bob')],
      d,
    )
    expect(result.left).toEqual(['!x'])
    expect(calls.remembered).toEqual([])
  })

  it('leaves invites with no intro', async () => {
    const {calls, deps: d} = deps({})
    await reconcileDirectInvites(
      [{roomId: '!y'}],
      [accepted('r1', 'did:plc:bob')],
      d,
    )
    expect(calls.left).toEqual(['!y'])
  })

  it('does not touch invites while nothing is accepted', async () => {
    const {calls, deps: d} = deps({'!b': {requestId: 'r1', did: 'did:plc:bob'}})
    const pending = {
      ...accepted('r1', 'did:plc:bob'),
      status: 'pending' as const,
    }
    const result = await reconcileDirectInvites([{roomId: '!b'}], [pending], d)
    expect(result).toEqual({verified: [], left: []})
    expect(calls.read).toEqual([])
  })

  it('uses each accepted request once', async () => {
    const {deps: d} = deps({
      '!b1': {requestId: 'r1', did: 'did:plc:bob'},
      '!b2': {requestId: 'r1', did: 'did:plc:bob'},
    })
    const result = await reconcileDirectInvites(
      [{roomId: '!b1'}, {roomId: '!b2'}],
      [accepted('r1', 'did:plc:bob'), accepted('r2', 'did:plc:carol')],
      d,
    )
    expect(result.verified).toEqual([{roomId: '!b1', did: 'did:plc:bob'}])
    expect(result.left).toEqual(['!b2'])
  })
})
