import {approveMatrixIdpLink} from './idpApproval'
import {requestAssertionSignature} from './im8Signer'

let mockRevision = 1
jest.mock('#/lib/im8/credentials', () => ({
  m8CredentialRevision: () => mockRevision,
}))
jest.mock('./im8Signer', () => ({requestAssertionSignature: jest.fn()}))
const sign = jest.mocked(requestAssertionSignature)
const issuer = 'https://idp.example'
const mas = 'https://mas.example/authorize'
const link = `para://idp-login?issuer=${encodeURIComponent(issuer)}&challenge=${'a'.repeat(43)}`
const originalFetch = global.fetch
beforeEach(() => {
  mockRevision = 1
  sign
    .mockReset()
    .mockResolvedValue({assertion: {} as never, signature: 'signature'})
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      redirect_uri:
        'https://mas.example/upstream/callback?code=code&state=state',
    }),
  })
})
afterEach(() => {
  global.fetch = originalFetch
})
it('signs the base64url IdP challenge and returns only the MAS continuation', async () => {
  await expect(approveMatrixIdpLink(link, issuer, mas)).resolves.toContain(
    'https://mas.example/',
  )
  expect(sign).toHaveBeenCalledWith('para-idp', 'a'.repeat(43), {
    signal: undefined,
  })
  expect(global.fetch).toHaveBeenCalledWith(
    `${issuer}/authorize/verify`,
    expect.objectContaining({redirect: 'error'}),
  )
})
it('rejects another issuer before asking for identity approval', async () => {
  await expect(
    approveMatrixIdpLink(
      link.replace('idp.example', 'evil.example'),
      issuer,
      mas,
    ),
  ).rejects.toThrow('INVALID_IDP_LINK')
  expect(sign).not.toHaveBeenCalled()
})
it('does not submit a signature after an account switch', async () => {
  sign.mockImplementation(async () => {
    mockRevision++
    return {assertion: {} as never, signature: 'signature'}
  })
  await expect(approveMatrixIdpLink(link, issuer, mas)).rejects.toThrow(
    'ACCOUNT_CHANGED',
  )
  expect(global.fetch).not.toHaveBeenCalled()
})
it('rejects a continuation outside MAS', async () => {
  jest.mocked(global.fetch).mockResolvedValue({
    ok: true,
    json: async () => ({
      redirect_uri: 'https://evil.example/?code=c&state=s',
    }),
  } as Response)
  await expect(approveMatrixIdpLink(link, issuer, mas)).rejects.toThrow(
    'INVALID_IDP_RETURN',
  )
})
it('cancellation prevents submitting the assertion', async () => {
  const controller = new AbortController()
  controller.abort()
  await expect(
    approveMatrixIdpLink(link, issuer, mas, controller.signal),
  ).rejects.toThrow()
  expect(global.fetch).not.toHaveBeenCalled()
})
