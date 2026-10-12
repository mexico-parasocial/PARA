/** React Native's AbortSignal polyfill has no timeout(), any(), or throwIfAborted(). */
export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new Error('CHAT_LOGIN_CANCELLED')
}

export function requestDeadline(parent?: AbortSignal, timeoutMs = 15_000) {
  const controller = new AbortController()
  const abort = () => controller.abort()
  parent?.addEventListener('abort', abort)
  if (parent?.aborted) abort()
  const timer = setTimeout(abort, timeoutMs)
  return {
    signal: controller.signal,
    dispose() {
      clearTimeout(timer)
      parent?.removeEventListener('abort', abort)
    },
  }
}
