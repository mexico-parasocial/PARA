import {useCallback, useEffect, useRef, useState} from 'react'
import {AppState} from 'react-native'
import uuid from 'react-native-uuid'
import {useQueryClient} from '@tanstack/react-query'

import * as Storage from '#/lib/storage'
import {bootstrapMatrixIdentity, rejoinCommunityRoom} from './bootstrap'

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
  const inFlight = useRef(false)
  const [ready, setReady] = useState(false)
  const [deviceId, setDeviceId] = useState<string | undefined>()
  const [error, setError] = useState<string | null>(null)

  const bootstrap = useCallback(async () => {
    if (!enabled || inFlight.current) return
    inFlight.current = true
    setError(null)
    try {
      const deviceId = await getMatrixInstallDeviceId()
      setDeviceId(deviceId)
      // The install id is only suitable as a requested appservice device id.
      // MAS creates its own device during OIDC; attest that actual id later.
      const result = await bootstrapMatrixIdentity({
        communityUris: [communityUri],
      })
      if (result.failedJoins.length) {
        throw new Error(result.failedJoins[0].error)
      }
      setReady(true)
      await queryClient.invalidateQueries({
        queryKey: ['matrix-space', communityUri],
      })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      inFlight.current = false
    }
  }, [communityUri, enabled, queryClient])

  const rejoin = useCallback(async () => {
    if (!enabled || inFlight.current) return
    inFlight.current = true
    try {
      await rejoinCommunityRoom(communityUri)
      await queryClient.invalidateQueries({
        queryKey: ['matrix-space', communityUri],
      })
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      inFlight.current = false
    }
  }, [communityUri, enabled, queryClient])

  useEffect(() => {
    setReady(false)
    if (enabled) void bootstrap()
  }, [bootstrap, enabled])

  useEffect(() => {
    if (!enabled) return
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active' || inFlight.current) return
      if (!ready) {
        void bootstrap()
      } else {
        void rejoin()
      }
    })
    return () => subscription.remove()
  }, [bootstrap, enabled, ready, rejoin])

  return {ready, deviceId, error, retry: bootstrap, rejoin}
}
