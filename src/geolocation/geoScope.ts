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
  state: 'Tu propuesta se asocia con el estado. Baja precisión, máxima privacidad.',
  district: 'Tu propuesta se asocia con tu distrito electoral federal.',
  city: 'Tu propuesta se asocia con tu ciudad o municipio.',
  neighborhood: 'Tu propuesta se asocia con tu colonia. Alta precisión, requiere verificación INE.',
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
