import {
  ELECTORAL_DISTRICTS,
  type ElectoralDistrict,
} from '#/lib/constants/electoralDistrictsData'
import {MEXICO_CITY_DATA} from '#/lib/constants/mexicoCityData'

export type GeoScope = 'state' | 'district' | 'city' | 'neighborhood'

export const GEO_SCOPE_LABELS: Record<GeoScope, string> = {
  state: 'Estado',
  district: 'Distrito Federal',
  city: 'Ciudad / Municipio',
  neighborhood: 'Colonia',
}

export const GEO_SCOPE_DESCRIPTIONS: Record<GeoScope, string> = {
  state:
    'Tu propuesta se asocia solo con el estado. No se guardan coordenadas de tu ubicación.',
  district:
    'Tu propuesta se asocia con tu distrito electoral federal. La ubicación se aproxima a ~1 km.',
  city: 'Tu propuesta se asocia con tu ciudad o municipio. La ubicación se aproxima a ~100 m.',
  neighborhood:
    'Tu propuesta se asocia con tu colonia. Alta precisión, requiere verificación INE.',
}

/**
 * Grid size in degrees for the coordinates stored at each scope.
 * `null` means no coordinates are stored at all; `0` means exact.
 *
 * Snapping uses floor (not round) so pins aggregate onto shared grid
 * points, giving natural k-anonymity on the public heatmap.
 */
export const GEO_SCOPE_GRID: Record<GeoScope, number | null> = {
  state: null,
  district: 0.01, // ~1.1 km
  city: 0.001, // ~110 m
  neighborhood: 0,
}

/**
 * Snap E7 coordinates onto the scope grid. Returns integers safe for
 * the lexicon bounds.
 */
export function snapGeoToGridE7(
  latE7: number,
  lngE7: number,
  grid: number,
): {latE7: number; lngE7: number} {
  if (grid <= 0) {
    return {latE7: Math.round(latE7), lngE7: Math.round(lngE7)}
  }
  return {
    latE7: Math.round(Math.floor(latE7 / 1e7 / grid) * grid * 1e7),
    lngE7: Math.round(Math.floor(lngE7 / 1e7 / grid) * grid * 1e7),
  }
}

export type ScopedGeo = {
  geo?: {latE7: number; lngE7: number}
  positionalAccuracy?: number
}

/**
 * Single choke point for the scope → stored-coordinates policy.
 * - state: region only. No coordinates, no accuracy — nothing that can
 *   place the user on a map is stored or transmitted.
 * - district/city: grid-snapped coordinates. The raw fix accuracy is
 *   deliberately dropped so the stored value never implies more
 *   precision than the grid carries.
 * - neighborhood: exact coordinates (explicit INE-verified consent).
 */
export function geoForScope(
  scope: GeoScope,
  latitude: number,
  longitude: number,
  positionalAccuracy?: number,
): ScopedGeo {
  const grid = GEO_SCOPE_GRID[scope]
  if (grid === null) {
    return {}
  }
  if (grid === 0) {
    return {
      geo: {
        latE7: Math.round(latitude * 1e7),
        lngE7: Math.round(longitude * 1e7),
      },
      positionalAccuracy,
    }
  }
  return {
    geo: snapGeoToGridE7(
      Math.round(latitude * 1e7),
      Math.round(longitude * 1e7),
      grid,
    ),
  }
}

/**
 * Find the closest electoral district to a given coordinate by centroid distance.
 */
export function findClosestDistrict(
  latitude: number,
  longitude: number,
): ElectoralDistrict | null {
  let closest: ElectoralDistrict | null = null
  let minDistance = Infinity

  for (const district of ELECTORAL_DISTRICTS) {
    if (!district.centroid) continue
    const d = haversineDistance(
      latitude,
      longitude,
      district.centroid.latitude,
      district.centroid.longitude,
    )
    if (d < minDistance) {
      minDistance = d
      closest = district
    }
  }

  return closest
}

/**
 * Find the closest major city to a given coordinate.
 */
export function findClosestCity(
  _latitude: number,
  _longitude: number,
): {name: string; stateName: string; distanceKm: number} | null {
  let closest: {name: string; stateName: string; distanceKm: number} | null =
    null
  let _minDistance = Infinity

  for (const [_stateName, cities] of Object.entries(MEXICO_CITY_DATA)) {
    for (const _city of cities) {
      // mexicoCityData doesn't have coordinates, so we can't do precise matching
      // In a real implementation, city data would include lat/lng
      // For now, we return the first city of the matching state as a fallback
    }
  }

  // TODO: Add coordinates to MEXICO_CITY_DATA for precise closest-city lookup
  return closest
}

/**
 * Determine which state contains a given coordinate.
 * For now, uses the closest district's state as a proxy.
 */
export function resolveStateFromCoordinate(
  latitude: number,
  longitude: number,
): string | null {
  const district = findClosestDistrict(latitude, longitude)
  return district?.stateName ?? null
}

/**
 * Haversine distance between two points in kilometers.
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371 // Earth's radius in km
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}
