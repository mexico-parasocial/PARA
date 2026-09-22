import {matrixBridgeFetch} from '#/lib/matrix/bridge'
import {
  BRIDGE_AUDIENCES,
  bridgeCallWithProof,
  clearMatrixAssertionSigner,
  MATRIX_PROOF_PURPOSE,
  MatrixProofUnavailableError,
  setMatrixAssertionSigner,
  type SignedAssertion,
} from '#/lib/matrix/proofs'

jest.mock('#/lib/matrix/bridge', () => ({
  matrixBridgeFetch: jest.fn(),
}))

const fetchMock = matrixBridgeFetch as jest.MockedFunction<
  typeof matrixBridgeFetch
>

const okJson = (body: unknown) =>
  ({ok: true, json: async () => body}) as Response

const badJson = (status: number, body: unknown) =>
  ({ok: false, status, json: async () => body}) as Response

describe('bridgeCallWithProof (CD-M6)', () => {
  beforeEach(() => {
    fetchMock.mockReset()
  })

  it('fetches one challenge, signs for the audience, and posts the assertion', async () => {
    fetchMock
      .mockResolvedValueOnce(
        okJson({
          challenge: 'c'.repeat(64),
          expiresAt: 'soon',
          purpose: MATRIX_PROOF_PURPOSE,
        }),
      )
      .mockResolvedValueOnce(okJson({userId: '@k4o2…:matrix.example'}))
    const signed: SignedAssertion = {
      assertion: {
        type: 'para.identity.pop.v1',
        purpose: MATRIX_PROOF_PURPOSE,
        audience: BRIDGE_AUDIENCES.identity,
        identityPub: 'ab'.repeat(32),
        challenge: 'c'.repeat(64),
        signedAt: '2026-09-21T00:00:00.000Z',
      },
      signature: '00'.repeat(64),
    }
    setMatrixAssertionSigner(async ({audience, challenge}) => {
      expect(audience).toBe(BRIDGE_AUDIENCES.identity)
      expect(challenge).toBe('c'.repeat(64))
      return signed
    })
    const res = await bridgeCallWithProof(
      BRIDGE_AUDIENCES.identity,
      '/api/matrix-identity',
    )
    expect(res).toEqual({userId: '@k4o2…:matrix.example'})
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/matrix-challenge', {
      method: 'POST',
    })
    const [path, init] = fetchMock.mock.calls[1]
    expect(path).toBe('/api/matrix-identity')
    const body = JSON.parse(init!.body as string)
    expect(body.assertion.audience).toBe(BRIDGE_AUDIENCES.identity)
    expect(body.signature).toBe('00'.repeat(64))
    // Extra fields ride alongside the assertion.
    void path
  })

  it('carries request fields next to the assertion', async () => {
    fetchMock
      .mockResolvedValueOnce(
        okJson({challenge: 'd'.repeat(64), purpose: MATRIX_PROOF_PURPOSE}),
      )
      .mockResolvedValueOnce(okJson({ok: true}))
    setMatrixAssertionSigner(async ({challenge}) => ({
      assertion: {
        type: 'para.identity.pop.v1',
        purpose: MATRIX_PROOF_PURPOSE,
        audience: BRIDGE_AUDIENCES.join,
        identityPub: 'cd'.repeat(32),
        challenge,
        signedAt: '2026-09-21T00:00:00.000Z',
      },
      signature: '11'.repeat(64),
    }))
    await bridgeCallWithProof(BRIDGE_AUDIENCES.join, '/api/community-join', {
      communityUri: 'at://c/com.para.community.board/one',
    })
    const body = JSON.parse(fetchMock.mock.calls[1][1]!.body as string)
    expect(body.communityUri).toBe('at://c/com.para.community.board/one')
    expect(body.assertion.audience).toBe(BRIDGE_AUDIENCES.join)
  })

  it('fails fast when no signer is configured', async () => {
    clearMatrixAssertionSigner()
    await expect(
      bridgeCallWithProof(BRIDGE_AUDIENCES.identity, '/api/matrix-identity'),
    ).rejects.toThrow(MatrixProofUnavailableError)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('surfaces the bridge error body on failure', async () => {
    fetchMock
      .mockResolvedValueOnce(
        okJson({challenge: 'e'.repeat(64), purpose: MATRIX_PROOF_PURPOSE}),
      )
      .mockResolvedValueOnce(badJson(401, {error: 'Invalid identity proof'}))
    setMatrixAssertionSigner(async ({challenge}) => ({
      assertion: {
        type: 'para.identity.pop.v1',
        purpose: MATRIX_PROOF_PURPOSE,
        audience: BRIDGE_AUDIENCES.session,
        identityPub: 'ef'.repeat(32),
        challenge,
        signedAt: '2026-09-21T00:00:00.000Z',
      },
      signature: '22'.repeat(64),
    }))
    await expect(
      bridgeCallWithProof(BRIDGE_AUDIENCES.session, '/api/matrix-token'),
    ).rejects.toThrow('Invalid identity proof')
  })
})
