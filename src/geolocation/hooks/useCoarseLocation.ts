import * as Location from 'expo-location'
import {useQuery} from '@tanstack/react-query'

import {normalizeDeviceLocation} from '#/geolocation/util'

export type CoarseLocation = {
  latitude: number
  longitude: number
  accuracy: number | undefined
  timestamp: number
  countryCode?: string
  regionCode?: string
}

/**
 * Coarse location for UI purposes (map centering, state pre-selection).
 *
 * - Accuracy: ~100m–1km
 * - Time: <500ms typical
 * - Battery: low
 * - Includes reverse geocode for country/region code
 * - Use `refetch()` to trigger on demand; not auto-fetched on mount
 */
export function useCoarseLocation() {
  return useQuery<CoarseLocation, Error>({
    queryKey: ['geolocation', 'coarse'],
    queryFn: async () => {
      const {status} = await Location.requestForegroundPermissionsAsync()
      if (!status.granted) {
        throw new Error('Location permission denied')
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })

      const locations = await Location.reverseGeocodeAsync({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      })
      const location = locations.at(0)
      const normalized = location
        ? normalizeDeviceLocation(location)
        : undefined

      return {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        timestamp: pos.timestamp,
        countryCode: normalized?.countryCode,
        regionCode: normalized?.regionCode,
      }
    },
    enabled: false, // Manual trigger via refetch()
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  })
}
