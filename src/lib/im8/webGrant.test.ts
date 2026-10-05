import AsyncStorage from '@react-native-async-storage/async-storage'

import {clearM8Session} from './api'
import {authorizeM8InBrowser, m8RedirectUri} from './authorization.web'
import {
  M8_GRANT_ERROR_KEY,
  M8_PENDING_GRANT_KEY,
  readM8Credentials,
  setM8ActiveAccount,
} from './credentials'
import {completeM8WebGrant} from './webGrant'

const ALICE = 'did:plc:alice'
const origin = 'https://para.example'
const code = `m8ex-${'a'.repeat(43)}`
const callback = `${origin}/m8-auth?attempt_id=attempt-1&exchange_code=${code}`
const pending = () => ({
  did: ALICE,
  attemptId: 'attempt-1',
  returnTo: `${origin}/m8-auth`,
  expiresAt: Date.now() + 60_000,
  returnPath: '/identity',
  verifier: 'v'.repeat(64),
})
const exchange = {
  authenticated: true,
  attemptId: 'attempt-1',
  sessionId: 'session-1',
  session: {sessionId: 'session-1', did: ALICE},
  tokens: {accessToken: 'access', refreshToken: 'refresh', expiresIn: 3600},
}
const originalFetch = global.fetch
const originalWindow = global.window
beforeEach(async () => {
  await clearM8Session()
  await AsyncStorage.clear()
  await setM8ActiveAccount(ALICE)
  Object.defineProperty(global, 'window', {
    configurable: true,
    value: {
      location: {
        origin,
        pathname: '/m8-auth',
        href: callback,
        assign: jest.fn(),
      },
      history: {
        replaceState: jest.fn((_: unknown, __: string, path: string) => {
          window.location.href = `${origin}${path}`
        }),
      },
    },
  })
  global.fetch = jest.fn().mockImplementation(async () => {
    expect(window.location.href).toBe(`${origin}/m8-auth`)
    return new Response(JSON.stringify(exchange), {status: 200})
  })
})
afterEach(() => {
  global.fetch = originalFetch
  Object.defineProperty(global, 'window', {
    configurable: true,
    value: originalWindow,
  })
})
it('uses a full-page web handoff to the origin callback', async () => {
  expect(m8RedirectUri()).toBe(`${origin}/m8-auth`)
  await authorizeM8InBrowser(
    'https://pds.example/authorize',
    Date.now() + 60000,
  )
  expect(window.location.assign).toHaveBeenCalledWith(
    'https://pds.example/authorize',
  )
})
it('strips the code before exchange, stores the DID-bound grant and restores the previous path', async () => {
  await AsyncStorage.setItem(M8_PENDING_GRANT_KEY, JSON.stringify(pending()))
  await expect(completeM8WebGrant(() => ALICE)).resolves.toBe('/identity')
  expect((await readM8Credentials()).did).toBe(ALICE)
  expect(await AsyncStorage.getItem(M8_PENDING_GRANT_KEY)).toBeNull()
  expect(await AsyncStorage.getItem(M8_GRANT_ERROR_KEY)).toBeNull()
})
it('does not replay a callback after its pending grant was removed', async () => {
  await AsyncStorage.setItem(M8_PENDING_GRANT_KEY, JSON.stringify(pending()))
  await completeM8WebGrant(() => ALICE)
  await completeM8WebGrant(() => ALICE)
  expect(global.fetch).toHaveBeenCalledTimes(1)
})
it.each([
  ['missing grant', undefined],
  ['expired grant', {...pending(), expiresAt: 0}],
  ['foreign origin', {...pending(), returnTo: 'https://other.example/m8-auth'}],
  ['missing verifier', {...pending(), verifier: undefined}],
  ['wrong DID', {...pending(), did: 'did:plc:bob'}],
])(
  'rejects %s without exchange and clears the pending grant',
  async (_, value) => {
    if (value)
      await AsyncStorage.setItem(M8_PENDING_GRANT_KEY, JSON.stringify(value))
    await completeM8WebGrant(() => ALICE)
    expect(global.fetch).not.toHaveBeenCalled()
    expect((await readM8Credentials()).accessToken).toBeNull()
    expect(await AsyncStorage.getItem(M8_GRANT_ERROR_KEY)).toBeTruthy()
    expect(await AsyncStorage.getItem(M8_PENDING_GRANT_KEY)).toBeNull()
  },
)
it.each([
  'https://evil.example',
  '//evil.example',
  '/\\evil.example',
  '/\n/evil.example',
  '/m8-auth?again=true',
])('does not redirect to an unsafe return path %s', async returnPath => {
  await AsyncStorage.setItem(
    M8_PENDING_GRANT_KEY,
    JSON.stringify({...pending(), returnPath}),
  )
  await expect(completeM8WebGrant(() => ALICE)).resolves.toBe('/')
})
it('is a no-op during ordinary app startup', async () => {
  window.location.pathname = '/'
  await expect(completeM8WebGrant(() => ALICE)).resolves.toBeUndefined()
  expect(global.fetch).not.toHaveBeenCalled()
  expect(window.history.replaceState).not.toHaveBeenCalled()
})
