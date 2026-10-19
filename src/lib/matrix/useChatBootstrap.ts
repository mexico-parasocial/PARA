import {useCallback, useEffect, useRef, useState} from 'react'
import {AppState} from 'react-native'
import uuid from 'react-native-uuid'
import {useQueryClient} from '@tanstack/react-query'

import {m8CredentialRevision} from '#/lib/im8/credentials'
import * as Storage from '#/lib/storage'
import {useSession} from '#/state/session'
import {bootstrapMatrixIdentity, rejoinCommunityRoom} from './bootstrap'
import {BridgeAuthError, BridgeResponseError} from './bridge'

const DEVICE_ID_KEY = 'matrix_install_device_id'

async function getMatrixInstallDeviceId(): Promise<string> {
  const stored = await Storage.getItemAsync(DEVICE_ID_KEY)
  if (stored) return stored
  const generated = String(uuid.v4())
  await Storage.setItemAsync(DEVICE_ID_KEY, generated)
  return generated
}

/** Starts the proof-bearing login before asking for a Matrix token. */
export function useChatBootstrap(communityUri: string, enabled: boolean) {
  const queryClient = useQueryClient()
  const {currentAccount} = useSession()
  const did = currentAccount?.did
  const scope = `${did ?? ''}:${communityUri}:${enabled}`
  const activeScope = useRef(scope)
  activeScope.current = scope
  const inFlight = useRef<string | undefined>(undefined)
  const [readyScope, setReadyScope] = useState<string>()
  const ready = readyScope === scope
  const [deviceId, setDeviceId] = useState<string | undefined>()
  const [error, setError] = useState<Error | null>(null)
  const [errorScope, setErrorScope] = useState<string>()

  const bootstrap = useCallback(async () => {
    if (!enabled || !did || inFlight.current === scope) return
    inFlight.current = scope
    const revision = m8CredentialRevision()
    const current = () =>
      activeScope.current === scope && revision === m8CredentialRevision()
    setError(null)
    setErrorScope(scope)
    try {
      const deviceId = await getMatrixInstallDeviceId()
      if (!current()) return
      setDeviceId(deviceId)
      // The install id is only suitable as a requested appservice device id.
      // MAS creates its own device during OIDC; attest that actual id later.
      const result = await bootstrapMatrixIdentity({
        communityUris: [communityUri],
      })
      if (!current()) return
      if (result.failedJoins.length) {
        const failed = result.failedJoins[0]
        if (failed.statusCode === 401 || failed.statusCode === 403)
          throw new BridgeAuthError(failed.statusCode, failed.error)
        if (failed.statusCode)
          throw new BridgeResponseError(failed.statusCode, failed.error)
        throw new Error(failed.error)
      }
      setReadyScope(scope)
      if (!current()) return
      await queryClient.invalidateQueries({
        queryKey: ['matrix-space', communityUri, did],
      })
    } catch (cause) {
      if (current())
        setError(cause instanceof Error ? cause : new Error(String(cause)))
    } finally {
      if (inFlight.current === scope) inFlight.current = undefined
    }
  }, [communityUri, did, enabled, queryClient, scope])

  const rejoin = useCallback(async () => {
    if (!enabled || !did || inFlight.current === scope) return
    inFlight.current = scope
    const revision = m8CredentialRevision()
    const current = () =>
      activeScope.current === scope && revision === m8CredentialRevision()
    setErrorScope(scope)
    try {
      await rejoinCommunityRoom(communityUri)
      if (!current()) return
      await queryClient.invalidateQueries({
        queryKey: ['matrix-space', communityUri, did],
      })
      setError(null)
    } catch (cause) {
      if (current())
        setError(cause instanceof Error ? cause : new Error(String(cause)))
    } finally {
      if (inFlight.current === scope) inFlight.current = undefined
    }
  }, [communityUri, did, enabled, queryClient, scope])

  useEffect(() => {
    setReadyScope(undefined)
    setError(null)
    setDeviceId(undefined)
    if (enabled) void bootstrap()
  }, [bootstrap, enabled])

  useEffect(() => {
    if (!enabled) return
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active' || inFlight.current === scope) return
      if (!ready) {
        void bootstrap()
      } else {
        void rejoin()
      }
    })
    return () => subscription.remove()
  }, [bootstrap, enabled, ready, rejoin, scope])

  return {
    ready,
    deviceId: ready ? deviceId : undefined,
    error: errorScope === scope ? error : null,
    retry: bootstrap,
    rejoin,
  }
}
