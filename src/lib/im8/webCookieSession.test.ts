import AsyncStorage from '@react-native-async-storage/async-storage'

jest.mock('./credentialStorage', () =>
  jest.requireActual('./credentialStorage.web'),
)
jest.mock('./refreshTransport', () => ({
  M8_COOKIE_REFRESH: 'cookie',
  M8_WEB_COOKIE_REFRESH: true,
}))

const ALICE = 'did:plc:alice'
const originalFetch = global.fetch
const originalWindow = global.window

function browserStorage() {
  const values = new Map<string, string>()
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
    removeItem: (key: string) => {
      values.delete(key)
    },
  }
}
let local: ReturnType<typeof browserStorage>
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {status})

/** A fresh page load: module state (in-memory tokens) is gone, localStorage is not. */
function reload() {
  jest.resetModules()
  return {
    api: require('./api') as typeof import('./api'),
    credentials: require('./credentials') as typeof import('./credentials'),
  }
}

beforeEach(async () => {
  await AsyncStorage.clear()
  local = browserStorage()
  Object.defineProperty(global, 'window', {
    configurable: true,
    value: {localStorage: local, sessionStorage: browserStorage()},
  })
})
afterEach(() => {
  global.fetch = originalFetch
  Object.defineProperty(global, 'window', {
    configurable: true,
    value: originalWindow,
  })
})

async function signIn() {
  const {api, credentials} = reload()
  await credentials.setM8ActiveAccount(ALICE)
  global.fetch = jest.fn().mockResolvedValue(
    json({
      authenticated: true,
      attemptId: 'attempt-1',
      sessionId: 'session-1',
      session: {sessionId: 'session-1', did: ALICE},
      tokens: {
        accessToken: 'access-1',
        refreshToken: null,
        refreshTransport: 'cookie',
        expiresIn: 900,
      },
    }),
  )
  const result = await api.exchangeM8Code('code', 'attempt-1', 'v'.repeat(64))
  await credentials.storeM8Credentials(
    ALICE,
    result.sessionId,
    result.tokens,
    credentials.m8CredentialRevision(),
  )
  const [, init] = (global.fetch as jest.Mock).mock.calls[0]
  expect(init.credentials).toBe('include')
  expect(init.headers['x-m8-refresh-transport']).toBe('cookie')
}

it('keeps no bearer credential in browser storage after a cookie sign-in', async () => {
  await signIn()
  const stored = [...local.values.values()].join(' ')
  expect(stored).not.toContain('access-1')
  expect(local.values.get('m8_web_session_did')).toBe(ALICE)
  expect(local.values.get('m8_web_refresh_cookie')).toBe('1')
})

it('resumes the cookie session for the same account after a reload', async () => {
  await signIn()
  const {api, credentials} = reload()
  await credentials.setM8ActiveAccount(ALICE)
  global.fetch = jest.fn().mockResolvedValue(
    json({
      accessToken: 'access-2',
      refreshToken: null,
      refreshTransport: 'cookie',
      expiresIn: 900,
      session: {sessionId: 'session-1', did: ALICE},
    }),
  )
  expect(await api.resumeM8WebSession(ALICE)).toBe(true)
  expect(await api.getM8AccessToken()).toBe('access-2')
  const [url, init] = (global.fetch as jest.Mock).mock.calls[0]
  expect(url).toMatch(/\/sessions\/refresh$/)
  expect(init.credentials).toBe('include')
  expect(JSON.parse(init.body)).toEqual({})
})

it('does not resume a cookie session for a different account', async () => {
  await signIn()
  const {api, credentials} = reload()
  await credentials.setM8ActiveAccount('did:plc:bob')
  global.fetch = jest.fn()
  expect(await api.resumeM8WebSession('did:plc:bob')).toBe(false)
  expect(global.fetch).not.toHaveBeenCalled()
})

it('retries once when another tab rotated the cookie first', async () => {
  await signIn()
  const {api, credentials} = reload()
  await credentials.setM8ActiveAccount(ALICE)
  global.fetch = jest
    .fn()
    .mockResolvedValueOnce(json({code: 'REFRESH_TOKEN_REUSED'}, 401))
    .mockResolvedValueOnce(
      json({
        accessToken: 'access-3',
        refreshToken: null,
        refreshTransport: 'cookie',
        expiresIn: 900,
        session: {sessionId: 'session-1', did: ALICE},
      }),
    )
  expect(await api.resumeM8WebSession(ALICE)).toBe(true)
  expect(global.fetch).toHaveBeenCalledTimes(2)
})

it('forgets the session marker when the cookie is gone', async () => {
  await signIn()
  const {api, credentials} = reload()
  await credentials.setM8ActiveAccount(ALICE)
  global.fetch = jest
    .fn()
    .mockResolvedValue(json({code: 'NO_REFRESH_COOKIE'}, 401))
  expect(await api.resumeM8WebSession(ALICE)).toBe(false)
  expect(local.values.get('m8_web_refresh_cookie')).toBeUndefined()
  expect(local.values.get('m8_web_session_did')).toBeUndefined()
})

it('logs out a reloaded page by refreshing first, then revoking through the cookie', async () => {
  await signIn()
  const {api, credentials} = reload()
  await credentials.setM8ActiveAccount(ALICE)
  global.fetch = jest
    .fn()
    .mockResolvedValueOnce(
      json({
        accessToken: 'access-4',
        refreshToken: null,
        refreshTransport: 'cookie',
        expiresIn: 900,
        session: {sessionId: 'session-1', did: ALICE},
      }),
    )
    .mockResolvedValueOnce(json({revoked: true}))
  await api.revokeM8Session()
  const [url, init] = (global.fetch as jest.Mock).mock.calls[1]
  expect(url).toMatch(/\/sessions\/logout$/)
  expect(init.headers.authorization).toBe('Bearer access-4')
  expect(init.credentials).toBe('include')
  expect(JSON.parse(init.body)).toEqual({})
  expect(local.values.get('m8_web_refresh_cookie')).toBeUndefined()
})
