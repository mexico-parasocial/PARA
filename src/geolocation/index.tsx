import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
} from 'react'

import {useSyncDeviceGeolocationOnStartup} from '#/geolocation/device'
import {useGeolocationServiceResponse} from '#/geolocation/service'
import {type Geolocation} from '#/geolocation/types'
import {mergeGeolocations} from '#/geolocation/util'
import {device, useStorage} from '#/storage'

export {
  useIsDeviceGeolocationGranted,
  useRequestDeviceGeolocation,
} from '#/geolocation/device'
export {
  findClosestDistrict,
  GEO_SCOPE_DESCRIPTIONS,
  GEO_SCOPE_LABELS,
  type GeoScope,
  resolveStateFromCoordinate,
} from '#/geolocation/geoScope'
export {
  type AccurateLocation,
  fetchAccurateLocation,
  useAccurateLocation,
} from '#/geolocation/hooks/useAccurateLocation'
export {
  type CoarseLocation,
  useCoarseLocation,
} from '#/geolocation/hooks/useCoarseLocation'
export {
  useLocationPermission,
} from '#/geolocation/hooks/useLocationPermission'
export {
  type M8IdentityLocation,
  useM8IdentityLocation,
} from '#/geolocation/hooks/useM8IdentityLocation'
export {
  useWatchPosition,
  type WatchPositionOptions,
} from '#/geolocation/hooks/useWatchPosition'
export {LocationPermissionGate} from '#/geolocation/LocationPermissionGate'
export {resolve} from '#/geolocation/service'
export * from '#/geolocation/types'

const GeolocationContext = createContext<Geolocation>({
  countryCode: undefined,
  regionCode: undefined,
})

const DeviceGeolocationAPIContext = createContext<{
  setDeviceGeolocation(deviceGeolocation: Geolocation): void
}>({
  setDeviceGeolocation: () => {},
})

export function useGeolocation() {
  return useContext(GeolocationContext)
}

export function useDeviceGeolocationApi() {
  return useContext(DeviceGeolocationAPIContext)
}

export function Provider({children}: {children: ReactNode}) {
  const geolocationService = useGeolocationServiceResponse()
  const [deviceGeolocation, setDeviceGeolocation] = useStorage(device, [
    'deviceGeolocation',
  ])
  const geolocation = useMemo(() => {
    return mergeGeolocations(deviceGeolocation, geolocationService)
  }, [deviceGeolocation, geolocationService])

  useEffect(() => {
    /**
     * Save this for out-of-band-reads during future cold starts of the app.
     * Needs to be available for the data prefetching we do on boot.
     */
    device.set(['mergedGeolocation'], geolocation)
  }, [geolocation])

  useSyncDeviceGeolocationOnStartup(setDeviceGeolocation)

  return (
    <GeolocationContext.Provider value={geolocation}>
      <DeviceGeolocationAPIContext.Provider
        value={useMemo(() => ({setDeviceGeolocation}), [setDeviceGeolocation])}>
        {children}
      </DeviceGeolocationAPIContext.Provider>
    </GeolocationContext.Provider>
  )
}
