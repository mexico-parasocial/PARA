import {m8Fetch} from '#/lib/im8/api'
import {
  clearMatrixAssertionSigner,
  type IdentityAssertion,
  setMatrixAssertionSigner,
} from '#/lib/matrix/proofs'

jest.mock('#/lib/im8/api', () => ({
  m8Fetch: jest.fn(),
}))
jest.mock('#/lib/matrix/bridge', () => ({
  matrixBridgeFetch: jest.fn(),
}))
jest.mock('#/Navigation', () => ({navigate: jest.fn()}))
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  child: jest.fn(),
}
jest.mock('#/logger', () => ({
  logger: mockLogger,
  Logger: {create: jest.fn(() => mockLogger), Context: {}},
}))

const m8FetchMock = m8Fetch as jest.MockedFunction<typeof m8Fetch>

const okJson = (body: unknown) =>
  ({ok: true, status: 200, json: async () => body}) as Response

const assertionBody = (challenge: string): IdentityAssertion => ({
  type: 'para.identity.pop.v1',
  purpose: 'matrix-login',
  audience: 'para-matrix-bridge/join.v1',
  identityPub: 'ab'.repeat(32),
  challenge,
  signedAt: '2026-09-21T00:00:00.000Z',
})

describe('im8Signer — requestAssertionSignature', () => {
  beforeEach(() => {
    m8FetchMock.mockReset()
    jest.useFakeTimers({advanceTimers: true})
  })
  afterEach(() => {
    jest.useRealTimers()
    clearMatrixAssertionSigner()
  })

  it('deposits the challenge, polls, and returns the fulfilled assertion', async () => {
    const {requestAssertionSignature} = await import('#/lib/matrix/im8Signer')
    m8FetchMock
      // create
      .mockResolvedValueOnce(okJson({id: 'req-1', status: 'pending'}))
      // poll 1: still pending
      .mockResolvedValueOnce(okJson({status: 'pending'}))
      // poll 2: fulfilled
      .mockResolvedValueOnce(
        okJson({
          status: 'fulfilled',
          assertion: {
            assertion: assertionBody('c'.repeat(64)),
            signature: '42'.repeat(64),
          },
        }),
      )

    const promise = requestAssertionSignature(
      'para-matrix-bridge/join.v1',
      'c'.repeat(64),
    )
    await promise.then(signed => {
      expect(signed.assertion.challenge).toBe('c'.repeat(64))
      expect(signed.signature).toBe('42'.repeat(64))
    })

    const [createCall, firstPoll] = m8FetchMock.mock.calls
    expect(createCall[0]).toBe('/matrix/sign-requests')
    expect(JSON.parse(createCall[1]!.body as string)).toEqual({
      challenge: 'c'.repeat(64),
      audience: 'para-matrix-bridge/join.v1',
    })
    expect(firstPoll[0]).toBe('/matrix/sign-requests/req-1')
  })

  it('gives up with a clear error when the wallet never approves', async () => {
    const {createIm8MatrixSignerWithDeadline} =
      await import('#/lib/matrix/im8Signer')
    m8FetchMock.mockImplementation(async (path: string) => {
      if (path === '/matrix/sign-requests') {
        return okJson({id: 'req-2', status: 'pending'})
      }
      return okJson({status: 'pending'})
    })
    const signer = createIm8MatrixSignerWithDeadline(150)
    await expect(
      signer({
        audience: 'para-matrix-bridge/join.v1',
        challenge: 'd'.repeat(64),
      }),
    ).rejects.toThrow('Firma no aprobada')
  })

  it('stops early when the relay expired the request', async () => {
    const {requestAssertionSignature} = await import('#/lib/matrix/im8Signer')
    m8FetchMock
      .mockResolvedValueOnce(okJson({id: 'req-3', status: 'pending'}))
      .mockResolvedValueOnce({ok: false, status: 404} as Response)

    await expect(
      requestAssertionSignature('para-matrix-bridge/join.v1', 'e'.repeat(64)),
    ).rejects.toThrow('Firma no aprobada')
    expect(m8FetchMock).toHaveBeenCalledTimes(2)
  })
})

describe('bootstrapMatrixIdentity (W1d)', () => {
  beforeEach(() => {
    m8FetchMock.mockReset()
    setMatrixAssertionSigner(async ({audience, challenge}) => ({
      assertion: {...assertionBody(challenge), audience},
      signature: '00'.repeat(64),
    }))
  })
  afterEach(() => {
    clearMatrixAssertionSigner()
  })

  it('runs identity → attest → join-all and reports partial failures', async () => {
    jest.resetModules()
    const bridgeCalls: Array<{audience: string; path: string}> = []
    jest.doMock('#/lib/matrix/proofs', () => {
      const actual = jest.requireActual<typeof import('#/lib/matrix/proofs')>(
        '#/lib/matrix/proofs',
      )
      return {
        ...actual,
        bridgeCallWithProof: jest.fn(
          async (
            audience: string,
            path: string,
            fields?: Record<string, unknown>,
          ) => {
            bridgeCalls.push({audience, path})
            if (path === '/api/matrix-identity') {
              return {userId: '@k:matrix.example', homeServer: 'https://m'}
            }
            if (path === '/api/matrix-attest') {
              return {deviceId: fields?.deviceId}
            }
            if (fields?.communityUri === 'at://c/one') {
              throw new Error('Space not found for community')
            }
            return {spaceId: `!space:${String(fields?.communityUri)}`}
          },
        ),
      }
    })
    const {bootstrapMatrixIdentity} = await import('#/lib/matrix/bootstrap')

    const result = await bootstrapMatrixIdentity({
      deviceId: 'PARA-install-1',
      communityUris: ['at://c/one', 'at://c/two'],
    })

    expect(result.userId).toBe('@k:matrix.example')
    expect(result.attestedDeviceId).toBe('PARA-install-1')
    expect(result.joined).toEqual(['!space:at://c/two'])
    expect(result.failedJoins).toEqual([
      {communityUri: 'at://c/one', error: 'Space not found for community'},
    ])
    expect(bridgeCalls.map(c => c.path)).toEqual([
      '/api/matrix-identity',
      '/api/matrix-attest',
      '/api/community-join',
      '/api/community-join',
    ])
    jest.doMock('#/lib/matrix/proofs', () =>
      jest.requireActual('#/lib/matrix/proofs'),
    )
  })
})
