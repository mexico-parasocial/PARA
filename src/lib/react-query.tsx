import {useEffect, useRef, useState} from 'react'
import {AppState, type AppStateStatus} from 'react-native'
import {createAsyncStoragePersister} from '@tanstack/query-async-storage-persister'
import {
  focusManager,
  onlineManager,
  QueryCache,
  QueryClient,
} from '@tanstack/react-query'
import {
  type PersistQueryClientOptions,
  PersistQueryClientProvider,
  type PersistQueryClientProviderProps,
} from '@tanstack/react-query-persist-client'

import {createPersistedQueryStorage} from '#/lib/persisted-query-storage'
import {logger} from '#/logger'
import {
  listenNetworkConfirmed,
  listenNetworkLost,
  listenSessionDropped,
} from '#/state/events'
import {PERSISTED_QUERY_ROOT} from '#/state/queries'
import * as env from '#/env'
import {IS_NATIVE, IS_WEB} from '#/env'

declare global {
  interface Window {
    __TANSTACK_QUERY_CLIENT__: import('@tanstack/query-core').QueryClient
  }
}

// any query keys in this array will be persisted to AsyncStorage

async function checkIsOnline(): Promise<boolean> {
  try {
    const controller = new AbortController()
    setTimeout(() => {
      controller.abort()
    }, 15e3)
    const res = await fetch('https://public.api.bsky.app/xrpc/_health', {
      cache: 'no-store',
      signal: controller.signal,
    })
    const json = await res.json()
    if (json.version) {
      return true
    } else {
      return false
    }
  } catch (e) {
    return false
  }
}

let receivedNetworkLost = false
let receivedNetworkConfirmed = false
let isNetworkStateUnclear = false

listenNetworkLost(() => {
  receivedNetworkLost = true
  onlineManager.setOnline(false)
})

/*
 * Re-arm auth reporting once the session layer has acted on the drop, so a
 * later dead session is reported again instead of being silenced for the
 * lifetime of the process.
 */
listenSessionDropped(() => {
  resetQueryAuthErrorReporting()
})

listenNetworkConfirmed(() => {
  receivedNetworkConfirmed = true
  onlineManager.setOnline(true)
})

let checkPromise: Promise<void> | undefined
function checkIsOnlineIfNeeded() {
  if (checkPromise) {
    return
  }
  receivedNetworkLost = false
  receivedNetworkConfirmed = false
  checkPromise = checkIsOnline().then(nextIsOnline => {
    checkPromise = undefined
    if (nextIsOnline && receivedNetworkLost) {
      isNetworkStateUnclear = true
    }
    if (!nextIsOnline && receivedNetworkConfirmed) {
      isNetworkStateUnclear = true
    }
    if (!isNetworkStateUnclear) {
      onlineManager.setOnline(nextIsOnline)
    }
  })
}

setInterval(() => {
  if (AppState.currentState === 'active') {
    if (!onlineManager.isOnline() || isNetworkStateUnclear) {
      checkIsOnlineIfNeeded()
    }
  }
}, 2000)

focusManager.setEventListener(onFocus => {
  if (IS_NATIVE) {
    const subscription = AppState.addEventListener(
      'change',
      (status: AppStateStatus) => {
        focusManager.setFocused(status === 'active')
      },
    )

    return () => subscription.remove()
  } else if (typeof window !== 'undefined' && window.addEventListener) {
    // these handlers are a bit redundant but focus catches when the browser window
    // is blurred/focused while visibilitychange seems to only handle when the
    // window minimizes (both of them catch tab changes)
    // there's no harm to redundant fires because refetchOnWindowFocus is only
    // used with queries that employ stale data times
    const handler = () => onFocus()
    window.addEventListener('focus', handler, false)
    window.addEventListener('visibilitychange', handler, false)
    return () => {
      window.removeEventListener('visibilitychange', handler)
      window.removeEventListener('focus', handler)
    }
  }
})

/*
 * A dead session fails every in-flight query at once, and each rejection
 * surfaces separately. In practice that was 758 identical
 * "XrpcResponseError: Token has expired" lines in one run - enough to bury any
 * real error in the log.
 *
 * Auth failures are already handled where they belong: the session layer
 * refreshes, and emits `session-dropped` when it cannot. There is nothing a
 * query can add, so report the first one per session and stay quiet after that.
 * Any other error still logs every time.
 */
const AUTH_ERROR_NAMES = new Set([
  'ExpiredToken',
  'InvalidToken',
  'AuthMissing',
])

function isAuthError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const {name, message} = error as {name?: unknown; message?: unknown}
  if (typeof name === 'string' && AUTH_ERROR_NAMES.has(name)) return true
  return (
    typeof message === 'string' &&
    /token has expired|invalid token|expiredtoken/i.test(message)
  )
}

let reportedAuthFailure = false

/** Called on `session-dropped` so the next dead session reports again. */
export function resetQueryAuthErrorReporting() {
  reportedAuthFailure = false
}

const createQueryClient = () =>
  new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (isAuthError(error)) {
          if (reportedAuthFailure) return
          reportedAuthFailure = true
          logger.warn('query: failing on an expired session', {
            queryKey: String(query.queryKey[0]),
          })
          return
        }
        logger.error(error instanceof Error ? error : String(error), {
          safeMessage: 'query failed',
          queryKey: String(query.queryKey[0]),
        })
      },
    }),
    defaultOptions: {
      queries: {
        // NOTE
        // refetchOnWindowFocus breaks some UIs (like feeds)
        // so we only selectively want to enable this
        // -prf
        refetchOnWindowFocus: false,
        // Structural sharing between responses makes it impossible to rely on
        // "first seen" timestamps on objects to determine if they're fresh.
        // Disable this optimization so that we can rely on "first seen" timestamps.
        structuralSharing: false,
        // We don't want to retry queries by default, because in most cases we
        // want to fail early and show a response to the user. There are
        // exceptions, and those can be made on a per-query basis. For others, we
        // should give users controls to retry.
        retry: false,
      },
    },
  })

const dehydrateOptions: PersistQueryClientProviderProps['persistOptions']['dehydrateOptions'] =
  {
    shouldDehydrateMutation: (_: unknown) => false,
    shouldDehydrateQuery: query => {
      const root = String(query.queryKey[0])
      return root === PERSISTED_QUERY_ROOT && query.state.status === 'success'
    },
  }

export function QueryProvider({
  children,
  currentDid,
}: {
  children: React.ReactNode
  currentDid: string | undefined
}) {
  return (
    <QueryProviderInner
      // Enforce we never reuse cache between users.
      // These two props MUST stay in sync.
      key={currentDid}
      currentDid={currentDid}>
      {children}
    </QueryProviderInner>
  )
}

function QueryProviderInner({
  children,
  currentDid,
}: {
  children: React.ReactNode
  currentDid: string | undefined
}) {
  const initialDid = useRef(currentDid)
  if (currentDid !== initialDid.current) {
    throw Error(
      'Something is very wrong. Expected did to be stable due to key above.',
    )
  }
  // We create the query client here so that it's scoped to a specific DID.
  // Do not move the query client creation outside of this component.
  const [queryClient, _setQueryClient] = useState(() => createQueryClient())
  const [persistOptions, _setPersistOptions] = useState(() => {
    const storage = createPersistedQueryStorage(currentDid ?? 'logged-out')
    const asyncPersister = createAsyncStoragePersister({
      storage,
      key: 'queryClient-' + (currentDid ?? 'logged-out'),
    })
    return {
      persister: asyncPersister,
      dehydrateOptions,
      buster: `${env.APP_VERSION}:persisted-success-only-v1`,
    } satisfies Omit<PersistQueryClientOptions, 'queryClient'>
  })
  useEffect(() => {
    if (IS_WEB) {
      // WARNING: leaving this enabled on newer TanStack Query builds can cause
      // the browser integration to OOM, so keep the extension hook disabled.
      // window.__TANSTACK_QUERY_CLIENT__ = queryClient
    }
  }, [queryClient])
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={persistOptions}>
      {children}
    </PersistQueryClientProvider>
  )
}
