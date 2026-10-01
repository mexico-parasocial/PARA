import {useCallback, useEffect, useState} from 'react'

import * as persisted from '#/state/persisted'
import {useSession} from '#/state/session'

export type MapProvider = 'google' | 'maplibre'
export type MapViewMode = 'standard' | 'satellite' | 'terrain' | 'hybrid'

const mapProviderListeners = new Set<(provider: MapProvider) => void>()

/**
 * Resolves which map provider + view mode to use.
 *
 * Rules:
 * 1. Anonymous users (no session) → always 'maplibre' (privacy-first)
 * 2. Authenticated with explicit preference → that preference
 * 3. Authenticated with no preference → 'google'
 */
export function useMapProvider() {
  const {hasSession} = useSession()

  const [storedProvider, setStoredProvider] = useState<
    persisted.Schema['mapProvider']
  >(() => persisted.get('mapProvider'))

  const [storedViewMode, setStoredViewMode] = useState<
    persisted.Schema['mapViewMode']
  >(() => persisted.get('mapViewMode'))

  useEffect(() => {
    const unsubscribe = persisted.onUpdate('mapProvider', setStoredProvider)
    mapProviderListeners.add(setStoredProvider)
    return () => {
      unsubscribe()
      mapProviderListeners.delete(setStoredProvider)
    }
  }, [])

  useEffect(() => {
    return persisted.onUpdate('mapViewMode', next => {
      setStoredViewMode(next)
    })
  }, [])

  // Anonymous → always MapLibre for privacy
  const resolvedProvider: MapProvider = hasSession
    ? (storedProvider ?? 'google')
    : 'maplibre'

  const resolvedViewMode: MapViewMode = storedViewMode ?? 'standard'

  // In anonymous mode, the toggle is locked to MapLibre
  const canChangeProvider = hasSession

  const setProvider = useCallback(
    (value: MapProvider) => {
      if (!hasSession) return // locked in anonymous
      void persisted.write('mapProvider', value)
      // Web broadcasts only reach other tabs. Notify mounted map/settings hooks
      // here too, including a map kept mounted behind the settings screen.
      for (const listener of mapProviderListeners) listener(value)
    },
    [hasSession],
  )

  const setViewMode = useCallback((value: MapViewMode) => {
    void persisted.write('mapViewMode', value)
  }, [])

  return {
    provider: resolvedProvider,
    viewMode: resolvedViewMode,
    canChangeProvider,
    setProvider,
    setViewMode,
  }
}
