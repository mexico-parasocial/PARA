import {useCallback, useEffect, useState} from 'react'
import * as Location from 'expo-location'

/**
 * Centralized location permission hook.
 *
 * Returns whether the user has granted foreground location permissions,
 * plus a function to request them.
 *
 * Based on expo-location's permission API, with web-safe error handling.
 */
export function useLocationPermission() {
  const [status, setStatus] = useState<Location.PermissionStatus>(
    Location.PermissionStatus.UNDETERMINED,
  )

  useEffect(() => {
    Location.getForegroundPermissionsAsync()
      .then(result => {
        setStatus(result.status)
      })
      .catch(() => {
        // Web may throw if navigator.permissions is unavailable
        setStatus(Location.PermissionStatus.DENIED)
      })
  }, [])

  const requestPermissions = useCallback(async () => {
    try {
      const result = await Location.requestForegroundPermissionsAsync()
      setStatus(result.status)
      return result.granted
    } catch {
      setStatus(Location.PermissionStatus.DENIED)
      return false
    }
  }, [])

  return {
    hasPermissions:
      status === Location.PermissionStatus.GRANTED,
    requestPermissions,
  }
}
