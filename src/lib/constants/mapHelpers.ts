import {ELECTORAL_DISTRICTS} from '#/lib/constants/electoralDistrictsData'
import {normalizeMexicoStateName} from '#/lib/constants/mexico'
import {MEXICO_CITY_DATA} from '#/lib/constants/mexicoCityData'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SearchResult {
  name: string
  type: 'state' | 'city' | 'district'
  /** State name — for cities/districts, this is the parent state */
  stateName: string
  /** Only set when type === 'district' */
  districtId?: number
  districtNumber?: number
  districtKey?: string
  subtitle?: string
  keywords?: string[]
  matchScore?: number
}

// ---------------------------------------------------------------------------
// Search index
// ---------------------------------------------------------------------------

let _cachedIndex: SearchResult[] | null = null

const STATE_ALIASES: Record<string, string[]> = {
  cdmx: ['CDMX', 'DF', 'Distrito Federal', 'Mexico City', 'Ciudad de Mexico'],
  'estado-de-mexico': ['Edomex', 'Edo Mex', 'Estado Mex', 'Mexico state'],
  'nuevo leon': ['NL'],
  queretaro: ['Qro'],
  michoacan: ['Michoacan de Ocampo'],
  veracruz: ['Veracruz de Ignacio de la Llave'],
}

function normalizeSearchValue(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

function searchTokens(query: string) {
  return normalizeSearchValue(query).split(/\s+/).filter(Boolean)
}

function isSubsequence(query: string, value: string) {
  if (!query) return false

  let queryIndex = 0
  for (const char of value) {
    if (char === query[queryIndex]) {
      queryIndex++
      if (queryIndex === query.length) return true
    }
  }

  return false
}

function getStateAliases(stateName: string) {
  const normalized = normalizeMexicoStateName(stateName)
  return (
    STATE_ALIASES[normalized] ||
    STATE_ALIASES[normalizeSearchValue(stateName)] ||
    []
  )
}

function stateDistrictCount(stateName: string) {
  const normalized = normalizeMexicoStateName(stateName)
  return ELECTORAL_DISTRICTS.filter(
    district => normalizeMexicoStateName(district.stateName) === normalized,
  ).length
}

function scoreSearchResult(result: SearchResult, query: string) {
  const normalizedQuery = normalizeSearchValue(query)
  const tokens = searchTokens(query)
  if (!normalizedQuery) return 0

  const values = [
    result.name,
    result.stateName,
    result.subtitle,
    ...(result.keywords || []),
  ]
    .filter(Boolean)
    .map(value => normalizeSearchValue(String(value)))

  let score = 0

  for (const value of values) {
    const words = value.split(/\s+/).filter(Boolean)

    if (value === normalizedQuery) score = Math.max(score, 120)
    if (value.startsWith(normalizedQuery)) score = Math.max(score, 95)
    if (words.some(word => word.startsWith(normalizedQuery))) {
      score = Math.max(score, 82)
    }
    if (value.includes(normalizedQuery)) score = Math.max(score, 68)
    if (tokens.length > 1 && tokens.every(token => value.includes(token))) {
      score = Math.max(score, 58)
    }
    if (normalizedQuery.length >= 3 && isSubsequence(normalizedQuery, value)) {
      score = Math.max(score, 26)
    }
  }

  if (result.type === 'district' && /\d/.test(normalizedQuery)) {
    const districtNumber = String(result.districtNumber || '')
    if (districtNumber === normalizedQuery.replace(/\D/g, '')) {
      score += 12
    }
  }

  return score
}

export function getSearchResultKey(result: SearchResult) {
  if (result.type === 'district') {
    return `district:${result.districtId || result.districtKey || result.name}`
  }

  return `${result.type}:${normalizeMexicoStateName(result.stateName)}:${normalizeSearchValue(
    result.name,
  )}`
}

/**
 * Build a flat, searchable array of states, federal districts and cities.
 * Cached after first call.
 */
export function buildSearchIndex(
  geoFeatures: Array<{properties: {state_name?: string; name?: string}}>,
): SearchResult[] {
  if (_cachedIndex) return _cachedIndex

  const results: SearchResult[] = []

  // 1. States from GeoJSON features
  const stateNames = new Set<string>()
  for (const f of geoFeatures) {
    const name = f.properties.state_name || f.properties.name
    if (name && !stateNames.has(name)) {
      stateNames.add(name)
      const districtCount = stateDistrictCount(name)
      const keywords = [name, ...getStateAliases(name)]
      results.push({
        name,
        type: 'state',
        stateName: name,
        subtitle: `${districtCount} federal district${
          districtCount === 1 ? '' : 's'
        }`,
        keywords,
      })
    }
  }

  // 2. Electoral districts
  for (const d of ELECTORAL_DISTRICTS) {
    results.push({
      name: `Distrito ${d.districtNumber}`,
      type: 'district',
      stateName: d.stateName,
      districtId: d.id,
      districtNumber: d.districtNumber,
      districtKey: d.districtKey,
      subtitle: d.stateName,
      keywords: [
        d.displayName,
        d.districtKey,
        d.currentDeputy,
        d.deputyParty,
        d.dominantParty,
        `D${d.districtNumber}`,
        `DF ${d.districtNumber}`,
        `Distrito ${d.districtNumber} ${d.stateName}`,
        `${d.stateName} distrito ${d.districtNumber}`,
        ...getStateAliases(d.stateName),
      ],
    })
  }

  // 3. Cities from MEXICO_CITY_DATA
  for (const [stateName, cities] of Object.entries(MEXICO_CITY_DATA)) {
    for (const city of cities) {
      results.push({
        name: city.name,
        type: 'city',
        stateName,
        subtitle: `${stateName} · ${city.population} · ${city.dominantParty}`,
        keywords: [
          `${city.name} ${stateName}`,
          city.population,
          city.dominantParty,
          city.governing_mayor,
          ...getStateAliases(stateName),
        ],
      })
    }
  }

  _cachedIndex = results
  return results
}

/**
 * Filter the index by query. Handles aliases, accent-insensitive text and
 * permissive partial matching. Returns the highest-scoring results.
 */
export function filterSearchIndex(
  index: SearchResult[],
  query: string,
  limit = 8,
): SearchResult[] {
  if (!query.trim()) return []
  const matches = index
    .map(result => ({...result, matchScore: scoreSearchResult(result, query)}))
    .filter(result => (result.matchScore || 0) > 0)

  const typeOrder: Record<string, number> = {state: 0, district: 1, city: 2}
  matches.sort((a, b) => {
    const scoreDiff = (b.matchScore || 0) - (a.matchScore || 0)
    if (scoreDiff !== 0) return scoreDiff

    const orderA = typeOrder[a.type] ?? 9
    const orderB = typeOrder[b.type] ?? 9
    if (orderA !== orderB) return orderA - orderB
    return a.name.localeCompare(b.name)
  })
  return matches.slice(0, limit)
}

// ---------------------------------------------------------------------------
// Centroid
// ---------------------------------------------------------------------------

export interface LatLng {
  latitude: number
  longitude: number
}

type GeoGeometry = {
  type?: string
  coordinates?: unknown
}

/**
 * Compute the centroid of a GeoJSON feature (Polygon or MultiPolygon).
 * Falls back to `{latitude:0, longitude:0}` if coords are empty.
 */
export function computeCentroid(feature: Record<string, unknown>): LatLng {
  const coords: LatLng[] = []

  const extractRing = (ring: number[][]) => {
    for (const c of ring) {
      coords.push({longitude: c[0], latitude: c[1]})
    }
  }

  const geom = feature.geometry as GeoGeometry | undefined
  if (!geom) return {latitude: 0, longitude: 0}

  if (geom.type === 'Polygon') {
    const coordinates = geom.coordinates as number[][][] | undefined
    extractRing(coordinates?.[0] || [])
  } else if (geom.type === 'MultiPolygon') {
    const coordinates = geom.coordinates as number[][][][] | undefined
    for (const poly of coordinates || []) {
      extractRing(poly[0] || [])
    }
  }

  if (coords.length === 0) return {latitude: 0, longitude: 0}

  const total = coords.reduce(
    (acc, c) => ({
      latitude: acc.latitude + c.latitude,
      longitude: acc.longitude + c.longitude,
    }),
    {latitude: 0, longitude: 0},
  )

  return {
    latitude: total.latitude / coords.length,
    longitude: total.longitude / coords.length,
  }
}

// ---------------------------------------------------------------------------
// Members parsing
// ---------------------------------------------------------------------------

/**
 * Parse a human-readable member string like "184k" or "2.8M" into a number.
 */
export function parseMemberCount(str: string): number {
  const clean = str.trim().toLowerCase()
  if (clean.endsWith('m')) {
    return Math.round(parseFloat(clean) * 1_000_000)
  }
  if (clean.endsWith('k')) {
    return Math.round(parseFloat(clean) * 1_000)
  }
  return parseInt(clean, 10) || 0
}

// ---------------------------------------------------------------------------
// Arcs and curves
// ---------------------------------------------------------------------------

/**
 * Computes a quadratic bezier curve between two geographic coordinates to draw
 * visually appealing bridging arcs on the map.
 *
 * @param start Starting coordinate
 * @param end Ending coordinate
 * @param offsetMultiplier Controls how high the arc curves. Higher is curvier.
 * @param resolution Number of points to generate along the curve.
 */
export function computeBezierCurve(
  start: LatLng,
  end: LatLng,
  offsetMultiplier = 0.2,
  resolution = 30,
): LatLng[] {
  // Edge case: if they are the same point
  if (start.latitude === end.latitude && start.longitude === end.longitude) {
    return [start, end]
  }

  // Find midpoint
  const midLat = (start.latitude + end.latitude) / 2
  const midLng = (start.longitude + end.longitude) / 2

  // Find vector from start to end
  const dLat = end.latitude - start.latitude
  const dLng = end.longitude - start.longitude

  // Perpendicular vector (-dy, dx)
  // To make it always curve "up" or in a predictable direction, we might need to enforce a sign.
  // We'll just use a simple perpendicular rotation for now.
  const perpLat = -dLng
  const perpLng = dLat

  // Control point is midpoint offset by the perpendicular vector
  const controlPoint: LatLng = {
    latitude: midLat + perpLat * offsetMultiplier,
    longitude: midLng + perpLng * offsetMultiplier,
  }

  const curve: LatLng[] = []
  for (let i = 0; i <= resolution; i++) {
    const t = i / resolution
    const oneMinusT = 1 - t

    const lat =
      Math.pow(oneMinusT, 2) * start.latitude +
      2 * oneMinusT * t * controlPoint.latitude +
      Math.pow(t, 2) * end.latitude

    const lng =
      Math.pow(oneMinusT, 2) * start.longitude +
      2 * oneMinusT * t * controlPoint.longitude +
      Math.pow(t, 2) * end.longitude

    curve.push({latitude: lat, longitude: lng})
  }

  return curve
}
