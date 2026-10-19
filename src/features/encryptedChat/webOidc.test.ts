import {
  clearMatrixWebSession,
  loadMatrixWebSession,
  type MatrixWebSession,
  refreshMatrixWebSession,
  storeRefreshedMatrixWebSession,
} from './webOidc'

jest.mock('matrix-js-sdk/lib/oidc/index.js', () => ({
  completeAuthorizationCodeGrant: jest.fn(),
  generateOidcAuthorizationUrl: jest.fn(),
  registerOidcClient: jest.fn(),
  validateAuthMetadataAndKeys: jest.fn(),
}))
jest.mock('#/lib/storage', () => ({
  deleteItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}))
jest.mock('#/logger', () => ({logger: {warn: jest.fn()}}))
const originalFetch = global.fetch
const data = new Map<string, string>()
const session: MatrixWebSession = {
  accountDid: 'did:plc:first',
  userId: '@first:example',
  deviceId: 'FIRST',
  accessToken: 'access',
  refreshToken: 'refresh',
  homeServer: 'https://matrix.example',
  tokenEndpoint: 'https://mas.example/token',
  clientId: 'client',
}
const key = (did: string) => `matrix_oidc_session.${encodeURIComponent(did)}`
beforeEach(() => {
  data.clear()
  Object.defineProperty(global, 'sessionStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => data.set(k, v),
      removeItem: (k: string) => data.delete(k),
    },
  })
  data.set(key(session.accountDid), JSON.stringify(session))
})
afterEach(() => {
  global.fetch = originalFetch
})
it('does not expose a stored session under another PARA account', async () => {
  expect(await loadMatrixWebSession('did:plc:second')).toBeUndefined()
  expect(await loadMatrixWebSession(session.accountDid)).toEqual(session)
})
it('ignores a late token refresh from another device', async () => {
  await storeRefreshedMatrixWebSession(session.accountDid, 'OTHER', {
    accessToken: 'wrong',
  })
  expect((await loadMatrixWebSession(session.accountDid))?.accessToken).toBe(
    'access',
  )
})
it('does not resurrect a session cleared while its refresh was pending', async () => {
  let respond!: (value: Response) => void
  global.fetch = jest.fn(
    () =>
      new Promise(resolve => {
        respond = resolve
      }),
  )
  const refreshing = refreshMatrixWebSession(session)
  await clearMatrixWebSession(session.accountDid)
  respond({ok: true, json: async () => ({access_token: 'new'})} as Response)
  expect(await refreshing).toBeUndefined()
  expect(await loadMatrixWebSession(session.accountDid)).toBeUndefined()
})
it('retains a session during a temporary token endpoint outage', async () => {
  global.fetch = jest.fn().mockResolvedValue({ok: false, status: 503})
  await expect(refreshMatrixWebSession(session)).rejects.toThrow(
    'REFRESH_UNAVAILABLE',
  )
  expect(await loadMatrixWebSession(session.accountDid)).toEqual(session)
})
