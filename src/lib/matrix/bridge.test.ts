import AsyncStorage from '@react-native-async-storage/async-storage'

import {BridgeAuthError, M8_SESSION_REQUIRED, matrixBridgeFetch} from './bridge'

describe('matrixBridgeFetch', () => {
  const originalFetch = global.fetch

  beforeEach(async () => {
    await AsyncStorage.multiRemove(['m8_access_token', 'm8_refresh_token'])
    global.fetch = jest.fn()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('sends the current M8 bearer token to the Matrix bridge', async () => {
    await AsyncStorage.setItem('m8_access_token', 'access-1')
    const fetchMock = global.fetch as jest.Mock
    fetchMock.mockResolvedValueOnce(new Response('{}', {status: 200}))

    await matrixBridgeFetch('/api/unread')

    expect(global.fetch).toHaveBeenCalledWith(
      'https://bridge.para.social/api/unread',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer access-1',
        }),
      }),
    )
  })

  it('refreshes an expired M8 token and retries the bridge request', async () => {
    await AsyncStorage.setItem('m8_access_token', 'access-old')
    await AsyncStorage.setItem('m8_refresh_token', 'refresh-1')
    await AsyncStorage.setItem('m8_session_id', 'session-1')
    await AsyncStorage.setItem('m8_session_did', 'did:plc:alice')
    const fetchMock = global.fetch as jest.Mock
    fetchMock
      .mockResolvedValueOnce(new Response('{}', {status: 401}))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            accessToken: 'access-new',
            refreshToken: 'refresh-new',
            expiresIn: 3600,
          }),
          {
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(new Response('{}', {status: 200}))

    await matrixBridgeFetch('/api/rooms')

    expect(global.fetch).toHaveBeenNthCalledWith(
      3,
      'https://bridge.para.social/api/rooms',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer access-new',
        }),
      }),
    )
  })

  it('fails locally without calling the bridge when there is no M8 session', async () => {
    const fetchMock = global.fetch as jest.Mock

    await expect(matrixBridgeFetch('/api/unread')).rejects.toMatchObject({
      name: 'BridgeAuthError',
      statusCode: 401,
      message: M8_SESSION_REQUIRED,
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('clears a rejected token after refresh fails', async () => {
    await AsyncStorage.setItem('m8_access_token', 'access-old')
    const fetchMock = global.fetch as jest.Mock
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({error: 'Invalid M8 bearer token'}), {
        status: 401,
      }),
    )

    await expect(matrixBridgeFetch('/api/unread')).rejects.toBeInstanceOf(
      BridgeAuthError,
    )
    expect(await AsyncStorage.getItem('m8_access_token')).toBeNull()
  })

  it('throws BridgeAuthError on 401 when refresh fails', async () => {
    await AsyncStorage.setItem('m8_access_token', 'access-old')
    const fetchMock = global.fetch as jest.Mock
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({error: 'Unauthorized'}), {status: 401}),
    )

    try {
      await matrixBridgeFetch('/api/cards')
      fail('Expected BridgeAuthError')
    } catch (e) {
      expect(e).toBeInstanceOf(BridgeAuthError)
      expect((e as BridgeAuthError).statusCode).toBe(401)
      expect((e as BridgeAuthError).message).toBe('Unauthorized')
    }
  })

  it('throws BridgeAuthError on 403', async () => {
    await AsyncStorage.setItem('m8_access_token', 'access-1')
    const fetchMock = global.fetch as jest.Mock
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({error: 'DID mismatch'}), {status: 403}),
    )

    try {
      await matrixBridgeFetch('/api/cards', {method: 'POST', body: '{}'})
      fail('Expected BridgeAuthError')
    } catch (e) {
      expect(e).toBeInstanceOf(BridgeAuthError)
      expect((e as BridgeAuthError).statusCode).toBe(403)
      expect((e as BridgeAuthError).message).toBe('DID mismatch')
    }
  })

  it('includes Content-Type header when body is present', async () => {
    await AsyncStorage.setItem('m8_access_token', 'access-1')
    const fetchMock = global.fetch as jest.Mock
    fetchMock.mockResolvedValueOnce(new Response('{}', {status: 200}))

    await matrixBridgeFetch('/api/cards', {
      method: 'POST',
      body: JSON.stringify({title: 'test'}),
    })

    expect(global.fetch).toHaveBeenCalledWith(
      'https://bridge.para.social/api/cards',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      }),
    )
  })
})

it('does not refresh, retry or clear a new account after an old bridge response', async () => {
  const {clearM8Session} = await import('#/lib/im8/api')
  const {
    m8CredentialRevision,
    readM8Credentials,
    setM8ActiveAccount,
    storeM8Credentials,
  } = await import('#/lib/im8/credentials')
  const originalFetch = global.fetch
  await clearM8Session()
  await setM8ActiveAccount('did:plc:alice')
  await storeM8Credentials(
    'did:plc:alice',
    'alice-session',
    {accessToken: 'alice', refreshToken: 'alice-refresh', expiresIn: 3600},
    m8CredentialRevision(),
  )
  let finish!: (value: Response) => void
  let started!: () => void
  const called = new Promise<void>(resolve => {
    started = resolve
  })
  global.fetch = jest.fn(() => {
    started()
    return new Promise<Response>(resolve => {
      finish = resolve
    })
  })
  try {
    const request = matrixBridgeFetch('/api/rooms')
    const rejected = expect(request).rejects.toBeInstanceOf(BridgeAuthError)
    await called
    await setM8ActiveAccount('did:plc:bob')
    await storeM8Credentials(
      'did:plc:bob',
      'bob-session',
      {accessToken: 'bob', refreshToken: 'bob-refresh', expiresIn: 3600},
      m8CredentialRevision(),
    )
    finish(new Response('{}', {status: 401}))
    await rejected
    expect(global.fetch).toHaveBeenCalledTimes(1)
    expect((await readM8Credentials()).did).toBe('did:plc:bob')
  } finally {
    global.fetch = originalFetch
    await clearM8Session()
  }
})
