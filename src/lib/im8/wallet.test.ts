import {m8Fetch} from '#/lib/im8/api'

jest.mock('#/lib/im8/api', () => ({
  m8Fetch: jest.fn(),
}))

const m8FetchMock = m8Fetch as jest.MockedFunction<typeof m8Fetch>
const okJson = (body: unknown) =>
  ({ok: true, status: 200, json: async () => body}) as Response
const status = (code: number) =>
  ({ok: false, status: code, json: async () => ({})}) as Response
const fast = {intervalMs: 1, deadlineMs: 2_000}

describe('iM8 wallet relay client', () => {
  beforeEach(() => m8FetchMock.mockReset())

  it('waits for the wallet to bind and returns only the binding id', async () => {
    const {requestWalletHolderBinding} = await import('#/lib/im8/wallet')
    m8FetchMock
      .mockResolvedValueOnce(
        okJson({id: 'wb-1', issuanceChallenge: 'chal', status: 'pending'}),
      )
      .mockResolvedValueOnce(okJson({id: 'wb-1', status: 'pending'}))
      .mockResolvedValueOnce(okJson({id: 'wb-1', status: 'bound'}))

    await expect(requestWalletHolderBinding(fast)).resolves.toEqual({
      walletBindingRequestId: 'wb-1',
      issuanceChallenge: 'chal',
    })
    expect(m8FetchMock.mock.calls[0][0]).toBe(
      '/identity/wallet/binding-requests',
    )
    // PARA sends nothing but the request: no key material in any call.
    for (const [, init] of m8FetchMock.mock.calls) {
      expect(init?.body).toBeUndefined()
    }
  })

  it('stops on decline and on expiry', async () => {
    const {requestWalletHolderBinding} = await import('#/lib/im8/wallet')
    m8FetchMock
      .mockResolvedValueOnce(okJson({id: 'wb-2', issuanceChallenge: 'c'}))
      .mockResolvedValueOnce(okJson({id: 'wb-2', status: 'declined'}))
    await expect(requestWalletHolderBinding(fast)).rejects.toMatchObject({
      reason: 'declined',
    })

    m8FetchMock
      .mockResolvedValueOnce(okJson({id: 'wb-3', issuanceChallenge: 'c'}))
      .mockResolvedValueOnce(status(404))
    await expect(requestWalletHolderBinding(fast)).rejects.toMatchObject({
      reason: 'expired',
    })
  })

  it('returns the presentation result once the wallet presented', async () => {
    const {awaitWalletPresentation} = await import('#/lib/im8/wallet')
    const future = new Date(Date.now() + 60_000).toISOString()
    const result = {
      valid: true,
      disclosedClaims: {age_over_18: true},
      disclosure: 'full-credential',
      revealedClaimIds: ['age_over_18', 'citizenship'],
      issuerDid: 'did:m8:ine:x',
      checkedAt: future,
    }
    m8FetchMock
      .mockResolvedValueOnce(
        okJson({
          id: 'r',
          status: 'active',
          expiresAt: future,
          resultDelivered: false,
        }),
      )
      .mockResolvedValueOnce(
        okJson({
          id: 'r',
          status: 'used',
          expiresAt: future,
          resultDelivered: true,
          result,
        }),
      )
    await expect(awaitWalletPresentation('r', fast)).resolves.toEqual(result)
    expect(m8FetchMock.mock.calls[0][0]).toBe('/identity/request/r')
  })

  it('reports a decline, and a result another client already read', async () => {
    const {awaitWalletPresentation} = await import('#/lib/im8/wallet')
    const future = new Date(Date.now() + 60_000).toISOString()
    m8FetchMock.mockResolvedValueOnce(
      okJson({
        id: 'r',
        status: 'declined',
        expiresAt: future,
        resultDelivered: false,
      }),
    )
    await expect(awaitWalletPresentation('r', fast)).rejects.toMatchObject({
      reason: 'declined',
    })

    m8FetchMock.mockResolvedValueOnce(
      okJson({
        id: 'r',
        status: 'used',
        expiresAt: future,
        resultDelivered: true,
      }),
    )
    await expect(awaitWalletPresentation('r', fast)).rejects.toMatchObject({
      reason: 'failed',
    })
  })
})
