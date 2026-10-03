import {useCallback, useEffect, useState} from 'react'

import {
  beginMatrixWebAuthorization,
  clearMatrixWebSession,
  isMatrixWebSessionExpired,
  loadMatrixWebSession,
  type MatrixWebSession,
  refreshMatrixWebSession,
} from '#/features/encryptedChat/webOidc'
import {logger} from '#/logger'
import {
  useMatrixAttestMutation,
  useMatrixIdentityQuery,
} from '#/state/queries/matrix'

export type MatrixWebSessionStatus =
  | 'loading'
  /** No usable session. The user has to authorize before chat can open. */
  | 'authorizationRequired'
  | 'ready'
  | 'error'

export interface MatrixWebSessionState {
  status: MatrixWebSessionStatus
  /** Shaped like the bridge's old token response, so callers are unchanged. */
  session?: MatrixWebSession & {userId: string}
  /** A stable code, not a message to render raw. */
  error?: string
  /** Sends the browser to the homeserver. Does not return. */
  authorize: () => void
  signOut: () => Promise<void>
}

/**
 * The web client's Matrix session.
 *
 * Replaces `useMatrixTokenQuery` on web. That endpoint cannot serve this
 * deployment: MAS owns logins, so the bridge has no way to mint a session and
 * answers 503. The session here comes from the homeserver's own
 * authorization-code flow and belongs to the browser, not the bridge.
 *
 * The MXID still comes from the bridge (`/api/matrix-identity`), which owns the
 * DID↔MXID mapping. The OP's `sub` is its own subject identifier and must not
 * be mistaken for one.
 */
export function useMatrixWebSession({
  enabled = true,
}: {enabled?: boolean} = {}): MatrixWebSessionState {
  const {
    data: identity,
    isLoading: identityLoading,
    error: identityError,
  } = useMatrixIdentityQuery({enabled})
  const [session, setSession] = useState<MatrixWebSession | undefined>()
  const [resolved, setResolved] = useState(false)
  const [error, setError] = useState<string | undefined>()

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    void (async () => {
      try {
        const stored = await loadMatrixWebSession()
        if (!stored) {
          if (!cancelled) setResolved(true)
          return
        }
        // MAS access tokens are short-lived, so a session restored from a
        // previous page load is usually already past its expiry. Refresh before
        // handing it to a client rather than letting the first request 401.
        const usable = isMatrixWebSessionExpired(stored)
          ? await refreshMatrixWebSession(stored)
          : stored
        if (cancelled) return
        setSession(usable)
        setResolved(true)
      } catch (cause) {
        logger.warn('matrix: could not restore the web chat session', {
          safeMessage: String(cause),
        })
        if (cancelled) return
        setError('MATRIX_SESSION_UNAVAILABLE')
        setResolved(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [enabled])

  // The device id MAS chose during authorization is the one the homeserver
  // knows, and the bridge needs it for attribution, moderation and revocation.
  // `useChatBootstrap` can only offer the local install id, which is a request
  // and not the real device — this closes that gap. Attested once per device;
  // fail-soft, because a session that works is still worth having.
  const attest = useMatrixAttestMutation()
  const [attested, setAttested] = useState<string | undefined>()
  useEffect(() => {
    const deviceId = session?.deviceId
    if (!deviceId || attested === deviceId || attest.isPending) return
    setAttested(deviceId)
    attest.mutate(
      {deviceId, friendlyName: 'PARA Web'},
      {
        onError: cause =>
          logger.warn(
            'matrix: device attestation failed; moderation and revocation will not reach this device',
            {safeMessage: String(cause)},
          ),
      },
    )
  }, [session?.deviceId, attested, attest])

  const authorize = useCallback(() => {
    if (!identity?.homeServer) return
    void beginMatrixWebAuthorization({
      homeServer: identity.homeServer,
    }).catch(cause => {
      logger.warn('matrix: could not start authorization', {
        safeMessage: String(cause),
      })
      setError('MATRIX_AUTH_UNAVAILABLE')
    })
  }, [identity?.homeServer])

  const signOut = useCallback(async () => {
    await clearMatrixWebSession()
    setSession(undefined)
  }, [])

  let status: MatrixWebSessionStatus = 'loading'
  if (error || identityError) {
    status = 'error'
  } else if (!enabled || identityLoading || !resolved) {
    status = 'loading'
  } else if (!session) {
    status = 'authorizationRequired'
  } else {
    status = 'ready'
  }

  return {
    status,
    // A session is only usable once the bridge has told us which MXID it is
    // for; the homeserver's token alone does not identify a PARA user.
    session:
      session && identity?.userId
        ? {...session, userId: identity.userId}
        : undefined,
    error:
      error ??
      (identityError instanceof Error ? identityError.message : undefined),
    authorize,
    signOut,
  }
}
