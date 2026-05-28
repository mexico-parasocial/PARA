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
  MEXICAN_STATES.map(state => normalizeBaseFilterValue(state)),
)

export type BaseFeedFilters = {
  party?: string
  community?: string
}

export function classifyBaseFeedFilters(filters: string[]): BaseFeedFilters {
  const result: BaseFeedFilters = {}

  for (const filter of filters) {
    const normalized = normalizeBaseFilterValue(filter)
    if (!normalized || STATE_FILTERS.has(normalized)) {
      continue
    }

    if (!result.party && PARTY_FILTERS.has(normalized)) {
      result.party = canonicalizeBasePartyFilter(filter)
      continue
    }

    if (!result.community && NINTH_FILTERS.has(normalized)) {
      result.community = stripBaseFilterPrefix(filter)
    }
  }

  return result
}

export function normalizeBaseFilterValue(value: string) {
  return value.trim().replace(/^p\//i, '').toLowerCase()
}

export function canonicalizeBasePartyFilter(value: string) {
  const normalized = normalizeBaseFilterValue(value)
  const party = PARTY_FILTERS.get(normalized)
  return party ? `p/${party}` : stripBaseFilterPrefix(value)
}

export function canonicalizeBaseCommunityFilter(value: string) {
  const normalized = normalizeBaseFilterValue(value)
  return PARTY_FILTERS.has(normalized)
    ? canonicalizeBasePartyFilter(value)
    : stripBaseFilterPrefix(value)
}

function stripBaseFilterPrefix(value: string) {
  return value.trim().replace(/^p\//i, '')
}
