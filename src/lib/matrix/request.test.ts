import {AbortController as NativeAbortController} from 'abort-controller'

import {requestDeadline, throwIfAborted} from './request'

afterEach(() => jest.useRealTimers())
it('works with the AbortSignal API used by React Native', () => {
  const controller = new NativeAbortController()
  expect(() => throwIfAborted(controller.signal as AbortSignal)).not.toThrow()
  const deadline = requestDeadline(controller.signal as AbortSignal)
  controller.abort()
  expect(deadline.signal.aborted).toBe(true)
  expect(() => throwIfAborted(controller.signal as AbortSignal)).toThrow(
    'CHAT_LOGIN_CANCELLED',
  )
  deadline.dispose()
})
it('times out a request and removes its timer when disposed', () => {
  jest.useFakeTimers()
  const first = requestDeadline(undefined, 100)
  jest.advanceTimersByTime(100)
  expect(first.signal.aborted).toBe(true)
  first.dispose()
  const second = requestDeadline(undefined, 100)
  second.dispose()
  jest.advanceTimersByTime(100)
  expect(second.signal.aborted).toBe(false)
})
