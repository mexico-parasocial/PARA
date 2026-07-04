import AsyncStorage from '@react-native-async-storage/async-storage'

import {BridgeAuthError, matrixBridgeFetch} from './bridge'

jest.mock('#/Navigation', () => ({
  navigate: jest.fn(),
}))

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
    const fetchMock = global.fetch as jest.Mock
    fetchMock
      .mockResolvedValueOnce(new Response('{}', {status: 401}))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({accessToken: 'access-new'}), {
          status: 200,
        }),
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
