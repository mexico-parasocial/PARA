import {useCallback, useState} from 'react'
import * as Location from 'expo-location'

import {IS_WEB} from '#/platform/detection'

export type AccurateLocation = {
  latitude: number
  longitude: number
  positionalAccuracy: number | undefined
  timestamp: number
}

/**
 * Fetch high-accuracy location at the moment it is needed.
 *
 * - Accuracy: ~5–20m
 * - Time: 2–5s typical
 * - Battery: moderate
 *
 * IMPORTANT: This is NOT cached. It fetches fresh every time to avoid
 * stale locations. Call it only when the user is about to save content
 * that needs precise georeferencing.
 *
 * On web, falls back to Balanced accuracy.
 */
export async function fetchAccurateLocation(): Promise<AccurateLocation> {
  const {status} = await Location.requestForegroundPermissionsAsync()
  if (!status.granted) {
    throw new Error('Location permission denied')
  }

  const pos = await Location.getCurrentPositionAsync({
    accuracy: IS_WEB
      ? Location.Accuracy.Balanced
      : Location.Accuracy.BestForNavigation,
  })

  return {
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
    positionalAccuracy: pos.coords.accuracy,
    timestamp: pos.timestamp,
  }
}

/**
 * Hook wrapper around fetchAccurateLocation for components that need
 * loading/error state.
 */
export function useAccurateLocation() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [location, setLocation] = useState<AccurateLocation | null>(null)

  const fetchLocation = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await fetchAccurateLocation()
      setLocation(result)
      return result
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      setError(err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const clear = useCallback(() => {
    setLocation(null)
    setError(null)
  }, [])

  return {location, isLoading, error, fetchLocation, clear}
}
