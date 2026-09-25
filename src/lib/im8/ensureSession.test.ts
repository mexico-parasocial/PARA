import AsyncStorage from '@react-native-async-storage/async-storage'

import {ensureM8SessionFor, M8_SESSION_DID_KEY} from './ensureSession'

const ALICE = 'did:plc:alice'
const BOB = 'did:plc:bob'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {status})
}

const startedBody = {
  attempt: {sessionId: 'session-1'},
  tokens: {accessToken: 'access-new', refreshToken: 'refresh-new'},
}

describe('ensureM8SessionFor', () => {
  const originalFetch = global.fetch

  beforeEach(async () => {
    await AsyncStorage.clear()
    global.fetch = jest.fn()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('reuses a token already bound to this account', async () => {
    await AsyncStorage.setItem('m8_access_token', 'access-1')
    await AsyncStorage.setItem(M8_SESSION_DID_KEY, ALICE)

    await expect(ensureM8SessionFor(ALICE)).resolves.toBe('existing')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('starts a session with the DID, not the handle, and binds it', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(json(startedBody))

    await expect(ensureM8SessionFor(ALICE)).resolves.toBe('started')

    const [url, init] = (global.fetch as jest.Mock).mock.calls[0]
    expect(url).toMatch(/\/v1\/sessions\/start$/)
    expect(JSON.parse(init.body)).toEqual({identifier: ALICE})
    expect(await AsyncStorage.getItem('m8_access_token')).toBe('access-new')
    expect(await AsyncStorage.getItem(M8_SESSION_DID_KEY)).toBe(ALICE)
  })

  it('replaces tokens that belong to another account', async () => {
    await AsyncStorage.setItem('m8_access_token', 'access-bob')
    await AsyncStorage.setItem(M8_SESSION_DID_KEY, BOB)
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(json(startedBody))

    await expect(ensureM8SessionFor(ALICE)).resolves.toBe('started')
    expect(await AsyncStorage.getItem('m8_access_token')).toBe('access-new')
    expect(await AsyncStorage.getItem(M8_SESSION_DID_KEY)).toBe(ALICE)
  })

  it('adopts an unbound token when the broker says it is this account', async () => {
    await AsyncStorage.setItem('m8_access_token', 'access-1')
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(
      json({session: {did: ALICE}, anonymousProfile: null}),
    )

    await expect(ensureM8SessionFor(ALICE)).resolves.toBe('existing')
    expect(await AsyncStorage.getItem(M8_SESSION_DID_KEY)).toBe(ALICE)
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('stores nothing when the broker requires the OAuth handoff', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(
      json({attempt: {attemptId: 'a1'}, tokens: null}, 202),
    )

    await expect(ensureM8SessionFor(ALICE)).resolves.toBe('pending_oauth')
    expect(await AsyncStorage.getItem('m8_access_token')).toBeNull()
    expect(await AsyncStorage.getItem(M8_SESSION_DID_KEY)).toBeNull()
  })
})
