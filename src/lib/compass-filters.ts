import {MEXICAN_STATES} from '#/lib/constants/mexico'

const PARTY_FILTERS = new Map([
  ['morena', 'Morena'],
  ['pan', 'PAN'],
  ['pri', 'PRI'],
  ['mc', 'MC'],
  ['pt', 'PT'],
  ['pvem', 'PVEM'],
  ['prd', 'PRD'],
  ['migala', 'Migala'],
])

const NINTH_FILTERS = new Set([
  'auth left',
  'lib left',
  'center left',
  'auth econocenter',
  'center econocenter',
  'lib econocenter',
  'center right',
  'lib right',
  'auth right',
])

const STATE_FILTERS = new Set(
  MEXICAN_STATES.map(state => normalizeCompassFilterValue(state)),
)

export type CompassFeedFilters = {
  party?: string
  community?: string
}

export function classifyCompassFeedFilters(
  filters: string[],
): CompassFeedFilters {
  const result: CompassFeedFilters = {}

  for (const filter of filters) {
    const normalized = normalizeCompassFilterValue(filter)
    if (!normalized || STATE_FILTERS.has(normalized)) {
      continue
    }

    if (!result.party && PARTY_FILTERS.has(normalized)) {
      result.party = canonicalizeCompassPartyFilter(filter)
      continue
    }

    if (!result.community && NINTH_FILTERS.has(normalized)) {
      result.community = stripCompassFilterPrefix(filter)
    }
  }

  return result
}

export function normalizeCompassFilterValue(value: string) {
  return value.trim().replace(/^p\//i, '').toLowerCase()
}

export function canonicalizeCompassPartyFilter(value: string) {
  const normalized = normalizeCompassFilterValue(value)
  const party = PARTY_FILTERS.get(normalized)
  return party ? `p/${party}` : stripCompassFilterPrefix(value)
}

export function canonicalizeCompassCommunityFilter(value: string) {
  const normalized = normalizeCompassFilterValue(value)
  return PARTY_FILTERS.has(normalized)
    ? canonicalizeCompassPartyFilter(value)
    : stripCompassFilterPrefix(value)
}

function stripCompassFilterPrefix(value: string) {
  return value.trim().replace(/^p\//i, '')
}
