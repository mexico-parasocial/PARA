import {fireEvent, render, screen} from '@testing-library/react-native'

import {CaptchaWebView} from './CaptchaWebView'

jest.mock('react-native-webview', () => {
  const {View} = require('react-native')
  return {WebView: (props: object) => <View testID="captcha" {...props} />}
})

it('reports a valid redirect immediately and only once', () => {
  const onSuccess = jest.fn()
  const onError = jest.fn()
  render(
    <CaptchaWebView
      url="https://bsky.social/gate/signup"
      stateParam="expected"
      onSuccess={onSuccess}
      onError={onError}
    />,
  )
  const redirect = {url: 'https://bsky.app/?state=expected&code=abc'}
  fireEvent(screen.getByTestId('captcha'), 'navigationStateChange', redirect)
  expect(onSuccess).toHaveBeenCalledWith('abc')
  fireEvent(screen.getByTestId('captcha'), 'navigationStateChange', redirect)
  expect(onSuccess).toHaveBeenCalledTimes(1)
  expect(onError).not.toHaveBeenCalled()
})

it('rejects a redirect with the wrong state', () => {
  const onSuccess = jest.fn()
  const onError = jest.fn()
  render(
    <CaptchaWebView
      url="https://bsky.social/gate/signup"
      stateParam="expected"
      onSuccess={onSuccess}
      onError={onError}
    />,
  )
  fireEvent(screen.getByTestId('captcha'), 'navigationStateChange', {
    url: 'https://bsky.app/?state=wrong&code=abc',
  })
  expect(onSuccess).not.toHaveBeenCalled()
  expect(onError).toHaveBeenCalledWith({
    reason: 'state-mismatch',
    host: 'bsky.app',
  })
})
