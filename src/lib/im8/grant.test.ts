import AsyncStorage from '@react-native-async-storage/async-storage'

import {clearM8Session, refreshM8AccessToken, revokeM8Session} from './api'
import {authorizeM8InBrowser} from './authorization'
import {
  M8_PENDING_GRANT_KEY,
  m8CredentialRevision,
  readM8Credentials,
  setM8ActiveAccount,
  storeM8Credentials,
} from './credentials'
import {connectM8SessionFor, finishM8Grant, type PendingM8Grant} from './grant'

jest.mock('./exchangeBinding', () => ({
  createM8ExchangeBinding: async () => ({
    verifier: 'v'.repeat(64),
    challenge: 'b'.repeat(43),
  }),
}))
jest.mock('./authorization', () => ({
  m8RedirectUri: () => 'para://m8-auth',
  authorizeM8InBrowser: jest.fn(),
}))
const ALICE = 'did:plc:alice'
const BOB = 'did:plc:bob'
const verifier = 'v'.repeat(64)
const challenge = 'b'.repeat(43)
const code = `m8ex-${'a'.repeat(43)}`
const callback = `para://m8-auth?attempt_id=attempt-1&exchange_code=${code}`
const tokens = {accessToken: 'access', refreshToken: 'refresh', expiresIn: 3600}
const exchange = {
  authenticated: true,
  attemptId: 'attempt-1',
  sessionId: 'session-1',
  session: {sessionId: 'session-1', did: ALICE},
  tokens,
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {status})
const browser = authorizeM8InBrowser as jest.MockedFunction<
  typeof authorizeM8InBrowser
>
function pending(): PendingM8Grant {
  return {
    did: ALICE,
    attemptId: 'attempt-1',
    returnTo: 'para://m8-auth',
    expiresAt: Date.now() + 60_000,
    returnPath: '/m8',
    verifier,
  }
}
function start() {
  return {
    attempt: {
      attemptId: 'attempt-1',
      returnTo: 'para://m8-auth',
      exchangeChallenge: challenge,
      authUrl: 'https://pds.example/authorize',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    },
    tokens: null,
    session: null,
  }
}
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(res => {
    resolve = res
  })
  return {promise, resolve}
}
const originalFetch = global.fetch
beforeEach(async () => {
  await clearM8Session()
  await AsyncStorage.clear()
  await setM8ActiveAccount(ALICE)
  global.fetch = jest.fn()
  browser.mockReset()
})
afterEach(() => {
  global.fetch = originalFetch
})

it('completes an explicit DID-bound grant and sends no bearer with start/exchange', async () => {
  ;(global.fetch as jest.Mock)
    .mockResolvedValueOnce(json(start(), 202))
    .mockResolvedValueOnce(json(exchange))
  browser.mockResolvedValueOnce(callback)
  await expect(connectM8SessionFor(ALICE, () => ALICE)).resolves.toMatchObject({
    tokens,
    session: {did: ALICE},
  })
  const requests = (global.fetch as jest.Mock).mock.calls
  expect(JSON.parse(requests[0][1].body)).toEqual({
    identifier: ALICE,
    platform: 'mobile',
    returnTo: 'para://m8-auth',
    exchangeChallenge: challenge,
  })
  expect(JSON.parse(requests[1][1].body)).toEqual({
    code,
    attemptId: 'attempt-1',
    verifier,
  })
  for (const [, init] of requests)
    expect(init.headers.authorization).toBeUndefined()
  expect(await readM8Credentials()).toMatchObject({
    accessToken: 'access',
    refreshToken: 'refresh',
    did: ALICE,
    sessionId: 'session-1',
  })
  expect(await AsyncStorage.getItem(M8_PENDING_GRANT_KEY)).toBeNull()
})

it('cancellation clears the unfinished grant without exchanging', async () => {
  ;(global.fetch as jest.Mock).mockResolvedValueOnce(json(start(), 202))
  browser.mockRejectedValueOnce(new Error('M8_LOGIN_CANCELLED'))
  await expect(connectM8SessionFor(ALICE, () => ALICE)).rejects.toThrow(
    'M8_LOGIN_CANCELLED',
  )
  expect(global.fetch).toHaveBeenCalledTimes(1)
  expect((await readM8Credentials()).accessToken).toBeNull()
  expect(await AsyncStorage.getItem(M8_PENDING_GRANT_KEY)).toBeNull()
})

it.each([
  ['wrong attempt', callback.replace('attempt-1', 'attempt-2')],
  ['wrong callback', callback.replace('para:', 'im8:')],
  ['duplicate code', `${callback}&exchange_code=${code}`],
  ['duplicate attempt', `${callback}&attempt_id=attempt-1`],
  ['provider error', 'para://m8-auth?attempt_id=attempt-1&error=denied'],
  ['invalid code', callback.replace(code, 'forged')],
])('rejects %s before contacting exchange', async (_, url) => {
  await expect(finishM8Grant(url, pending(), () => ALICE)).rejects.toThrow()
  expect(global.fetch).not.toHaveBeenCalled()
})

it('rejects expired attempts before contacting exchange', async () => {
  await expect(
    finishM8Grant(callback, {...pending(), expiresAt: 0}, () => ALICE),
  ).rejects.toThrow('M8_LOGIN_EXPIRED')
  expect(global.fetch).not.toHaveBeenCalled()
})
it.each([
  {...exchange, session: {...exchange.session, did: BOB}},
  {...exchange, attemptId: 'other'},
  {...exchange, sessionId: 'other'},
  {...exchange, tokens: {...tokens, refreshToken: null}},
])(
  'does not save a mismatched or incomplete exchange response %#',
  async body => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(json(body))
    await expect(
      finishM8Grant(callback, pending(), () => ALICE),
    ).rejects.toThrow()
    expect((await readM8Credentials()).accessToken).toBeNull()
  },
)
it('account changes while the browser is open cannot complete the old grant', async () => {
  const opened = deferred<void>()
  const result = deferred<string>()
  let did = ALICE
  ;(global.fetch as jest.Mock).mockResolvedValueOnce(json(start(), 202))
  browser.mockImplementationOnce(() => {
    opened.resolve()
    return result.promise
  })
  const login = connectM8SessionFor(ALICE, () => did)
  const rejected = expect(login).rejects.toThrow('M8_ACCOUNT_CHANGED')
  await opened.promise
  did = BOB
  await setM8ActiveAccount(BOB)
  result.resolve(callback)
  await rejected
  expect(global.fetch).toHaveBeenCalledTimes(1)
  expect((await readM8Credentials()).accessToken).toBeNull()
})
it('logout during exchange invalidates the response before storage', async () => {
  const requested = deferred<void>()
  const response = deferred<Response>()
  ;(global.fetch as jest.Mock).mockImplementationOnce(() => {
    requested.resolve()
    return response.promise
  })
  const grant = finishM8Grant(callback, pending(), () => ALICE)
  const rejected = expect(grant).rejects.toThrow('M8_ACCOUNT_CHANGED')
  await requested.promise
  await revokeM8Session()
  response.resolve(json(exchange))
  await rejected
  expect((await readM8Credentials()).accessToken).toBeNull()
})
it('persists rotated refresh credentials and shares simultaneous refresh requests', async () => {
  await storeM8Credentials(ALICE, 'session-1', tokens, m8CredentialRevision())
  const rotated = {
    ...tokens,
    accessToken: 'next-access',
    refreshToken: 'next-refresh',
  }
  ;(global.fetch as jest.Mock).mockResolvedValueOnce(json(rotated))
  await expect(
    Promise.all([refreshM8AccessToken(), refreshM8AccessToken()]),
  ).resolves.toEqual([true, true])
  expect(global.fetch).toHaveBeenCalledTimes(1)
  expect(await readM8Credentials()).toMatchObject({
    accessToken: rotated.accessToken,
    refreshToken: rotated.refreshToken,
    did: ALICE,
    sessionId: 'session-1',
  })
})
it('an in-flight refresh cannot restore credentials after logout', async () => {
  await storeM8Credentials(ALICE, 'session-1', tokens, m8CredentialRevision())
  const requested = deferred<void>()
  const response = deferred<Response>()
  ;(global.fetch as jest.Mock)
    .mockImplementationOnce(() => {
      requested.resolve()
      return response.promise
    })
    .mockResolvedValueOnce(json({revoked: true}))
  const refresh = refreshM8AccessToken()
  await requested.promise
  await revokeM8Session()
  response.resolve(json({...tokens, refreshToken: 'next'}))
  await expect(refresh).resolves.toBe(false)
  expect((await readM8Credentials()).accessToken).toBeNull()
})
it('local logout remains effective when remote revocation fails', async () => {
  await storeM8Credentials(ALICE, 'session-1', tokens, m8CredentialRevision())
  ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('offline'))
  await expect(revokeM8Session()).rejects.toThrow('offline')
  expect((await readM8Credentials()).accessToken).toBeNull()
})

it('rolls back a credential bundle when storage fails during commit', async () => {
  ;(global.fetch as jest.Mock).mockResolvedValueOnce(json(exchange))
  const write = jest
    .spyOn(AsyncStorage, 'setItem')
    .mockRejectedValueOnce(new Error('storage unavailable'))
  try {
    await expect(
      finishM8Grant(callback, pending(), () => ALICE),
    ).rejects.toThrow('storage unavailable')
    expect(await readM8Credentials()).toMatchObject({
      accessToken: null,
      refreshToken: null,
      did: null,
      sessionId: null,
    })
  } finally {
    write.mockRestore()
  }
})
