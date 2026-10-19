import {completeAuthorizationCodeGrant} from 'matrix-js-sdk/lib/oidc/index.js'

import {
  completeMatrixWebAuthorization,
  loadMatrixWebSession,
  type MatrixWebSession,
} from '#/features/encryptedChat/webOidc'
import {logoutChatAccount} from './chatLogout.web'

jest.mock('matrix-js-sdk/lib/oidc/index.js', () => ({
  completeAuthorizationCodeGrant: jest.fn(),
  generateOidcAuthorizationUrl: jest.fn(),
  registerOidcClient: jest.fn(),
  validateAuthMetadataAndKeys: jest.fn(),
}))
jest.mock('#/lib/storage', () => ({deleteItemAsync: jest.fn()}))
jest.mock('#/logger', () => ({logger: {warn: jest.fn()}}))

const originalFetch = global.fetch
const originalWindow = global.window
const data = new Map<string, string>()
const session: MatrixWebSession = {
  accountDid: 'did:plc:web-logout-first',
  userId: '@first:example',
  deviceId: 'FIRST',
  accessToken: 'access',
  homeServer: 'https://matrix.example',
  tokenEndpoint: 'https://mas.example/token',
  clientId: 'client',
}
const key = (did: string) => `matrix_oidc_session.${encodeURIComponent(did)}`
beforeEach(() => {
  data.clear()
  jest.clearAllMocks()
  Object.defineProperty(global, 'sessionStorage', {
    configurable: true,
    value: {
      getItem: (name: string) => data.get(name) ?? null,
      setItem: (name: string, value: string) => data.set(name, value),
      removeItem: (name: string) => data.delete(name),
    },
  })
  data.set(key(session.accountDid), JSON.stringify(session))
  data.set(
    key('did:plc:web-logout-second'),
    JSON.stringify({...session, accountDid: 'did:plc:web-logout-second'}),
  )
})
afterEach(() => {
  global.fetch = originalFetch
  Object.defineProperty(global, 'window', {
    configurable: true,
    value: originalWindow,
  })
})

it('clears local access and pending login offline without clearing another account', async () => {
  data.set(
    'matrix_oidc_pending',
    JSON.stringify({accountDid: session.accountDid}),
  )
  global.fetch = jest.fn().mockRejectedValue(new Error('offline'))
  await expect(logoutChatAccount(session.accountDid)).rejects.toThrow('offline')
  expect(await loadMatrixWebSession(session.accountDid)).toBeUndefined()
  expect(data.has('matrix_oidc_pending')).toBe(false)
  expect(await loadMatrixWebSession('did:plc:web-logout-second')).toBeDefined()
})

it('rejects an authorization grant arriving after logout', async () => {
  Object.defineProperty(global, 'window', {
    configurable: true,
    value: {
      location: {
        pathname: '/matrix-auth',
        search: '?code=code&state=state',
      },
    },
  })
  data.set(
    'matrix_oidc_pending',
    JSON.stringify({
      accountDid: session.accountDid,
      homeServer: session.homeServer,
      state: 'state',
      returnTo: '/messages',
    }),
  )
  let finish!: () => void
  const entered = new Promise<void>(resolve => {
    jest.mocked(completeAuthorizationCodeGrant).mockImplementation(() => {
      resolve()
      return new Promise(res => {
        finish = () =>
          res({} as Awaited<ReturnType<typeof completeAuthorizationCodeGrant>>)
      }) as ReturnType<typeof completeAuthorizationCodeGrant>
    })
  })
  const completion = completeMatrixWebAuthorization()
  const rejected = expect(completion).rejects.toThrow(
    'MATRIX_AUTH_ACCOUNT_MISMATCH',
  )
  await entered
  global.fetch = jest.fn().mockResolvedValue({ok: true})
  await logoutChatAccount(session.accountDid)
  finish()
  await rejected
  expect(await loadMatrixWebSession(session.accountDid)).toBeUndefined()
})
