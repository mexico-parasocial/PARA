import {emitNetworkConfirmed, emitNetworkLost} from '#/state/events'

/*
 * Captured once at module load so the wrapper below is immune to later
 * monkey-patching of globalThis.fetch.
 */
const realFetch = globalThis.fetch

/**
 * Fetch wrapper that reports network reachability to the app-wide event bus.
 * Any resolved response (including HTTP errors) confirms the network is up; a
 * thrown error (DNS failure, timeout, offline) reports it as lost.
 */
export const networkAwareFetch: typeof fetch = async (...args) => {
  try {
    const res = await realFetch(...args)
    emitNetworkConfirmed()
    return res
  } catch (e) {
    emitNetworkLost()
    /*
     * The platform's message says what went wrong ("hostname could not be
     * found", "could not connect") but never which request it was, which makes
     * a transport failure unactionable in a log. Name the origin - not the full
     * URL, which can carry identifiers in its path or query.
     */
    throw new Error(`fetch failed for ${describeTarget(args[0])}`, {cause: e})
  }
}

/** Origin only: paths and query strings can carry handles, DIDs and tokens. */
function describeTarget(input: unknown): string {
  try {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input instanceof Request
            ? input.url
            : undefined
    return url ? new URL(url).origin : 'an unknown target'
  } catch {
    return 'an unparseable target'
  }
}
