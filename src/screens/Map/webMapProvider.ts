import {type MapProvider} from '#/lib/hooks/useMapProvider'

export const GOOGLE_MAPS_WEB_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY?.trim() || ''

/** An unconfigured Google map cannot render; preserve exploration with MapLibre. */
export function resolveWebMapProvider(
  preference: MapProvider,
  googleApiKey = GOOGLE_MAPS_WEB_API_KEY,
): MapProvider {
  return preference === 'google' && !googleApiKey.trim()
    ? 'maplibre'
    : preference
}
