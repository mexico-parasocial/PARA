import * as WebBrowser from 'expo-web-browser'

import {authorizeM8InBrowser} from './authorization'

jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: jest.fn(),
  dismissAuthSession: jest.fn(),
}))
const open = WebBrowser.openAuthSessionAsync as jest.Mock
beforeEach(() => jest.clearAllMocks())
afterEach(() => jest.useRealTimers())
it('uses the registered native callback and returns its URL', async () => {
  open.mockResolvedValueOnce({type: 'success', url: 'para://m8-auth?code=test'})
  await expect(
    authorizeM8InBrowser('https://pds.example/auth', Date.now() + 60_000),
  ).resolves.toBe('para://m8-auth?code=test')
  expect(open).toHaveBeenCalledWith(
    'https://pds.example/auth',
    'para://m8-auth',
    {preferEphemeralSession: true},
  )
})
it.each(['cancel', 'dismiss'])(
  'reports browser %s as cancellation',
  async type => {
    open.mockResolvedValueOnce({type})
    await expect(
      authorizeM8InBrowser('https://pds.example/auth', Date.now() + 60_000),
    ).rejects.toThrow('M8_LOGIN_CANCELLED')
  },
)
it('expires a browser grant and dismisses its session', async () => {
  jest.useFakeTimers()
  open.mockReturnValueOnce(new Promise(() => {}))
  const result = expect(
    authorizeM8InBrowser('https://pds.example/auth', Date.now() + 1000),
  ).rejects.toThrow('M8_LOGIN_EXPIRED')
  await jest.advanceTimersByTimeAsync(1000)
  await result
  expect(WebBrowser.dismissAuthSession).toHaveBeenCalled()
})
