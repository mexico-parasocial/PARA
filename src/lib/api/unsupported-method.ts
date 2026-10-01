/**
 * Backends deliberately decline features whose backing service isn't part of
 * the current deployment (e.g. IRIS suggestions/topics in local dev): the
 * AppView answers 501 `MethodNotImplemented`, and the suggestions-agent stub
 * answers 404 `XRPCNotSupported`. These are expected, not actionable, so they
 * must not red-box the app.
 */
export function isUnsupportedMethodError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const {
    name,
    message,
    status,
    error: errorCode,
  } = error as {
    name?: unknown
    message?: unknown
    status?: unknown
    error?: unknown
  }
  if (name === 'MethodNotImplementedError') return true
  if (
    errorCode === 'XRPCNotSupported' ||
    errorCode === 'MethodNotImplemented'
  ) {
    return true
  }
  if (status === 501) return true
  // The lex client words it "Method Not Implemented" (with spaces); older
  // clients used the camel-cased code.
  return (
    typeof message === 'string' &&
    /method ?not ?implemented|xrpc ?not ?supported/i.test(message)
  )
}
