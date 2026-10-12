import {useCallback, useEffect, useState} from 'react'

import {logger} from '#/logger'
import {
  useMatrixAttestMutation,
  useMatrixIdentityQuery,
} from '#/state/queries/matrix'
import {useSession} from '#/state/session'
import {
  getWebCryptoStore,
  type WebCryptoStore,
} from '#/features/encryptedChat/webCryptoStore'
import {
  beginMatrixWebAuthorization,
  clearMatrixWebSession,
  isMatrixWebSessionExpired,
  loadMatrixWebSession,
  type MatrixWebSession,
  refreshMatrixWebSession,
} from '#/features/encryptedChat/webOidc'

export type MatrixWebSessionStatus =
  'loading' | 'authorizationRequired' | 'ready' | 'error'
export interface MatrixWebSessionState {
  status: MatrixWebSessionStatus
  session?: MatrixWebSession & WebCryptoStore
  error?: string
  authorize: () => void
  retry: () => void
  signOut: () => Promise<void>
}

/** A session becomes usable only after identity, crypto storage and actual-device attestation. */
export function useMatrixWebSession({
  enabled = true,
}: {enabled?: boolean} = {}): MatrixWebSessionState {
  const did = useSession().currentAccount?.did
  const {
    data: identity,
    isLoading: identityLoading,
    error: identityError,
  } = useMatrixIdentityQuery({enabled: enabled && !!did})
  const {mutateAsync: attest} = useMatrixAttestMutation()
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{
    did?: string
    status: MatrixWebSessionStatus
    session?: MatrixWebSession & WebCryptoStore
    error?: string
  }>({status: 'loading'})

  useEffect(() => {
    if (!enabled || !did || !identity) return
    let cancelled = false
    setResult({did, status: 'loading'})
    void (async () => {
      try {
        const stored = await loadMatrixWebSession(did)
        const usable =
          stored &&
          (isMatrixWebSessionExpired(stored)
            ? await refreshMatrixWebSession(stored)
            : stored)
        if (cancelled) return
        if (!usable) {
          setResult({did, status: 'authorizationRequired'})
          return
        }
        if (
          usable.userId !== identity.userId ||
          usable.homeServer.replace(/\/$/, '') !==
            identity.homeServer.replace(/\/$/, '')
        ) {
          await clearMatrixWebSession(did)
          throw new Error('MATRIX_AUTH_ACCOUNT_MISMATCH')
        }
        const cryptoStore = await getWebCryptoStore(
          did,
          usable.homeServer,
          usable.deviceId,
        )
        if (cancelled) return
        await attest({deviceId: usable.deviceId, friendlyName: 'PARA Web'})
        if (cancelled) return
        setResult({did, status: 'ready', session: {...usable, ...cryptoStore}})
      } catch (cause) {
        if (cancelled) return
        logger.warn('matrix: web session initialization failed', {
          safeMessage: 'Chat session unavailable',
        })
        setResult({
          did,
          status: 'error',
          error:
            cause instanceof Error &&
            cause.message === 'CHAT_SECURE_BROWSER_REQUIRED'
              ? cause.message
              : 'MATRIX_SESSION_UNAVAILABLE',
        })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [enabled, did, identity, attempt, attest])

  const authorize = useCallback(() => {
    if (!did || !identity?.homeServer) return
    void beginMatrixWebAuthorization({
      accountDid: did,
      homeServer: identity.homeServer,
    }).catch(() =>
      setResult({did, status: 'error', error: 'MATRIX_AUTH_UNAVAILABLE'}),
    )
  }, [did, identity?.homeServer])
  const retry = useCallback(() => setAttempt(value => value + 1), [])
  const signOut = useCallback(async () => {
    if (!did) return
    const current = await loadMatrixWebSession(did)
    try {
      if (current) {
        const response = await fetch(
          `${current.homeServer.replace(/\/$/, '')}/_matrix/client/v3/logout`,
          {
            method: 'POST',
            headers: {Authorization: `Bearer ${current.accessToken}`},
            signal: AbortSignal.timeout(15_000),
          },
        )
        if (!response.ok && response.status !== 401)
          throw new Error('MATRIX_LOGOUT_UNAVAILABLE')
      }
    } finally {
      await clearMatrixWebSession(did)
      setResult({did, status: 'authorizationRequired'})
    }
  }, [did])

  if (!enabled || !did || identityLoading || result.did !== did)
    return {status: 'loading', authorize, retry, signOut}
  if (identityError)
    return {
      status: 'error',
      error: 'MATRIX_IDENTITY_UNAVAILABLE',
      authorize,
      retry,
      signOut,
    }
  return {...result, authorize, retry, signOut}
}
