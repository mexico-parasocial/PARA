import {matrixBridgeFetch} from '#/lib/matrix/bridge'
import {
  acceptDirectMessageRequest,
  createEncryptedDirectRoom,
  declineDirectMessageRequest,
  listDirectMessageRequests,
  requestDirectMessage,
} from '#/lib/matrix/directMessages'
import {
  BRIDGE_AUDIENCES,
  clearMatrixAssertionSigner,
  setMatrixAssertionSigner,
} from '#/lib/matrix/proofs'

jest.mock('#/lib/matrix/bridge', () => ({
  matrixBridgeFetch: jest.fn(),
}))

const bridgeFetch = matrixBridgeFetch as jest.MockedFunction<
  typeof matrixBridgeFetch
>

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {status})
}

describe('direct message requests (bridge)', () => {
  afterEach(() => {
    bridgeFetch.mockReset()
    clearMatrixAssertionSigner()
  })

  it('asks with a dm.v1 proof and the recipient DID', async () => {
    const audiences: string[] = []
    setMatrixAssertionSigner(async ({audience, challenge}) => {
      audiences.push(audience)
      return {
        assertion: {
          type: 'para.identity.pop.v1',
          purpose: 'matrix-login',
          audience,
          identityPub: 'aa'.repeat(32),
          challenge,
          signedAt: '2026-10-10T00:00:00.000Z',
        },
        signature: 'bb'.repeat(64),
      }
    })
    bridgeFetch
      .mockResolvedValueOnce(
        json({
          challenge: 'c'.repeat(64),
          expiresAt: 'x',
          purpose: 'matrix-login',
        }),
      )
      .mockResolvedValueOnce(json({id: 'r1', expiresAt: 'later'}, 201))

    await expect(requestDirectMessage('did:plc:bob')).resolves.toEqual({
      id: 'r1',
      expiresAt: 'later',
    })
    expect(audiences).toEqual([BRIDGE_AUDIENCES.dm])
    const [path, init] = bridgeFetch.mock.calls[1]
    expect(path).toBe('/api/dm-requests')
    expect(JSON.parse(String(init?.body))).toMatchObject({
      recipientDid: 'did:plc:bob',
      signature: 'bb'.repeat(64),
    })
  })

  it('lists, accepts and declines by id', async () => {
    bridgeFetch.mockResolvedValueOnce(json({incoming: [], outgoing: []}))
    await expect(listDirectMessageRequests()).resolves.toEqual({
      incoming: [],
      outgoing: [],
    })

    bridgeFetch.mockResolvedValueOnce(
      json({requesterDid: 'did:plc:alice', requesterMxid: '@a:matrix.x'}),
    )
    await expect(acceptDirectMessageRequest('r1')).resolves.toEqual({
      requesterDid: 'did:plc:alice',
      requesterMxid: '@a:matrix.x',
    })
    expect(bridgeFetch.mock.calls[1][0]).toBe('/api/dm-requests/accept')

    bridgeFetch.mockResolvedValueOnce(json({removed: true}))
    await declineDirectMessageRequest('r1')
    expect(bridgeFetch.mock.calls[2][0]).toBe('/api/dm-requests/decline')
    expect(JSON.parse(String(bridgeFetch.mock.calls[2][1]?.body))).toEqual({
      id: 'r1',
    })
  })

  it('surfaces the bridge error code', async () => {
    bridgeFetch.mockResolvedValueOnce(
      json({error: 'No such pending request for you'}, 404),
    )
    await expect(acceptDirectMessageRequest('gone')).rejects.toThrow(
      'No such pending request for you',
    )
  })
})

describe('createEncryptedDirectRoom', () => {
  const session = {
    homeServer: 'https://matrix.example/',
    accessToken: 'tok',
    userId: '@me:matrix.example',
  }
  let fetchMock: jest.Mock

  beforeEach(() => {
    fetchMock = jest.fn()
    global.fetch = fetchMock
  })

  it('creates the room encrypted from the start and records it in m.direct', async () => {
    fetchMock
      .mockResolvedValueOnce(json({room_id: '!dm:matrix.example'}))
      .mockResolvedValueOnce(
        json({'@other:matrix.example': ['!old:matrix.example']}),
      )
      .mockResolvedValueOnce(json({}))

    await expect(
      createEncryptedDirectRoom(session, '@a:matrix.example'),
    ).resolves.toBe('!dm:matrix.example')

    const [createUrl, createInit] = fetchMock.mock.calls[0]
    expect(createUrl).toBe(
      'https://matrix.example/_matrix/client/v3/createRoom',
    )
    expect(createInit.headers.Authorization).toBe('Bearer tok')
    const body = JSON.parse(createInit.body)
    expect(body).toMatchObject({is_direct: true, invite: ['@a:matrix.example']})
    expect(body.initial_state).toContainEqual({
      type: 'm.room.encryption',
      state_key: '',
      content: {algorithm: 'm.megolm.v1.aes-sha2'},
    })

    const [putUrl, putInit] = fetchMock.mock.calls[2]
    expect(putUrl).toBe(
      'https://matrix.example/_matrix/client/v3/user/%40me%3Amatrix.example/account_data/m.direct',
    )
    expect(putInit.method).toBe('PUT')
    expect(JSON.parse(putInit.body)).toEqual({
      '@other:matrix.example': ['!old:matrix.example'],
      '@a:matrix.example': ['!dm:matrix.example'],
    })
  })

  it('starts m.direct when the account has none yet', async () => {
    fetchMock
      .mockResolvedValueOnce(json({room_id: '!dm:matrix.example'}))
      .mockResolvedValueOnce(json({errcode: 'M_NOT_FOUND'}, 404))
      .mockResolvedValueOnce(json({}))
    await createEncryptedDirectRoom(session, '@a:matrix.example')
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual({
      '@a:matrix.example': ['!dm:matrix.example'],
    })
  })

  it('fails without touching m.direct when the room cannot be created', async () => {
    fetchMock.mockResolvedValueOnce(json({errcode: 'M_FORBIDDEN'}, 403))
    await expect(
      createEncryptedDirectRoom(session, '@a:matrix.example'),
    ).rejects.toThrow('M_FORBIDDEN')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
