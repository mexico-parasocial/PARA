/**
 * Policies Service
 *
 * Handles fetching policy and matter records from live civic debates.
 */

import {type BskyAgent} from '@atproto/api'

import {fetchCabildeos} from '#/lib/api/cabildeo'
import {mapCabildeosToView} from '#/lib/cabildeo-client'
import {
  getCabildeoBadge,
  getCabildeoTotalParticipants,
} from '#/lib/cabildeo-display'
import {type PolicyItem} from '#/lib/mock-data'
import {
  COMMUNITY_MATTERS,
  COMMUNITY_POLICIES,
  FEATURED_MATTERS,
  FEATURED_POLICIES,
  PARTY_MATTERS,
  PARTY_POLICIES,
  RECOMMENDED_MATTERS,
  RECOMMENDED_POLICIES,
  STATE_MATTERS,
  STATE_POLICIES,
} from '#/lib/mock-data'
import {MOCK_CABILDEO_VIEWS} from '#/lib/mock-data/cabildeos'
import {USE_MOCK_DATA} from './config'
import {type PaginationParams, type ServiceResponse} from './types'

export type PolicyFeed =
  | 'featured'
  | 'community'
  | 'party'
  | 'state'
  | 'recommended'

export interface PoliciesQueryParams extends PaginationParams {
  feed: PolicyFeed
  type?: 'Policy' | 'Matter' // Filter by type
}

/**
 * Fetch policies from a specific feed
 */
export async function fetchPolicies(
  agent: BskyAgent,
  params: PoliciesQueryParams,
): Promise<ServiceResponse<PolicyItem[]>> {
  if (USE_MOCK_DATA) {
    await simulateNetworkDelay()

    const useMatters = params.type === 'Matter'
    const cabildeoItems = MOCK_CABILDEO_VIEWS.map(mapCabildeoToPolicyItem).filter(
      item => item.type === (params.type || 'Policy'),
    )

    // Select the appropriate feed based on type
    let data: PolicyItem[]
    switch (params.feed) {
      case 'featured':
        data = useMatters ? FEATURED_MATTERS : FEATURED_POLICIES
        break
      case 'community':
        data = useMatters ? COMMUNITY_MATTERS : COMMUNITY_POLICIES
        break
      case 'party':
        data = useMatters ? PARTY_MATTERS : PARTY_POLICIES
        break
      case 'state':
        data = useMatters ? STATE_MATTERS : STATE_POLICIES
        break
      case 'recommended':
        data = useMatters ? RECOMMENDED_MATTERS : RECOMMENDED_POLICIES
        break
      default:
        data = useMatters ? FEATURED_MATTERS : FEATURED_POLICIES
    }

    const wiredCabildeoItems = filterItemsByFeed(cabildeoItems, params.feed)
    data = [...wiredCabildeoItems, ...data]

    // Apply pagination
    const limit = params?.limit || 20
    const start = 0
    data = data.slice(start, start + limit)

    return {data, cursor: data.length >= limit ? 'next-page' : undefined}
  }

  const records = await fetchCabildeos(agent, {
    limit: params.limit ?? 50,
  })
  const cabildeos = mapCabildeosToView(records)
  const items = cabildeos
    .map(mapCabildeoToPolicyItem)
    .filter(item => item.type === (params.type || 'Policy'))

  const filtered = filterItemsByFeed(items, params.feed)
  const limit = params.limit || 20

  return {
    data: filtered.slice(0, limit),
    cursor: filtered.length > limit ? 'next-page' : undefined,
  }
}

/**
 * Fetch a single policy by ID
 */
export async function fetchPolicyById(
  agent: BskyAgent,
  id: string,
): Promise<PolicyItem | null> {
  if (USE_MOCK_DATA) {
    await simulateNetworkDelay()

    // Search across all feeds
    const allItems = [
      ...FEATURED_POLICIES,
      ...COMMUNITY_POLICIES,
      ...PARTY_POLICIES,
      ...STATE_POLICIES,
      ...RECOMMENDED_POLICIES,
      ...FEATURED_MATTERS,
      ...COMMUNITY_MATTERS,
      ...PARTY_MATTERS,
      ...STATE_MATTERS,
      ...RECOMMENDED_MATTERS,
    ]

    return allItems.find(p => p.id === id) || null
  }

  const records = await fetchCabildeos(agent, {limit: 100})
  return (
    mapCabildeosToView(records)
      .map(mapCabildeoToPolicyItem)
      .find(item => item.id === id) || null
  )
}

function simulateNetworkDelay(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 100))
}

function mapCabildeoToPolicyItem(
  cabildeo: Awaited<ReturnType<typeof mapCabildeosToView>>[number],
): PolicyItem {
  const badge = getCabildeoBadge(cabildeo)
  const participantCount = getCabildeoTotalParticipants(cabildeo)
  const leadingShare = getLeadingShare(cabildeo)
  const promotedBy = getPromotedBy(cabildeo)

  return {
    id: cabildeo.uri,
    cabildeoUri: cabildeo.uri,
    source: 'cabildeo',
    type: badge.kind === 'policy' ? 'Policy' : 'Matter',
    category: cabildeo.community || badge.label,
    title: cabildeo.title,
    promotedBy,
    support:
      typeof leadingShare === 'number'
        ? Math.round(leadingShare * 100)
        : undefined,
    mentions: cabildeo.positionCounts.total,
    match:
      typeof leadingShare === 'number'
        ? Math.round(leadingShare * 100)
        : undefined,
    community: cabildeo.community,
    state: cabildeo.region || undefined,
    color: badge.color,
    verified:
      cabildeo.voteTotals.total > 0 || cabildeo.positionCounts.total > 0,
    phase: cabildeo.phase,
    participantCount,
    voteCount: cabildeo.voteTotals.total,
    positionCount: cabildeo.positionCounts.total,
  }
}

function filterItemsByFeed(items: PolicyItem[], feed: PolicyFeed) {
  const sorted = [...items].sort(comparePolicyItems)

  switch (feed) {
    case 'featured':
      return sorted.filter(item => item.phase !== 'draft')
    case 'community':
      return sorted.filter(item => Boolean(item.community))
    case 'state':
      return sorted.filter(item => Boolean(item.state))
    case 'party':
      return sorted.filter(item => Boolean(item.party))
    case 'recommended':
      return sorted
    default:
      return sorted
  }
}

function comparePolicyItems(a: PolicyItem, b: PolicyItem) {
  const aScore =
    (a.participantCount || 0) * 10 +
    (a.voteCount || 0) * 4 +
    (a.positionCount || 0)
  const bScore =
    (b.participantCount || 0) * 10 +
    (b.voteCount || 0) * 4 +
    (b.positionCount || 0)
  if (aScore !== bScore) {
    return bScore - aScore
  }
  return a.title.localeCompare(b.title)
}

function getLeadingShare(
  cabildeo: Awaited<ReturnType<typeof mapCabildeosToView>>[number],
) {
  const optionCount =
    cabildeo.outcome?.breakdown.length || cabildeo.optionSummary.length
  if (optionCount === 0) return undefined

  const total =
    cabildeo.outcome?.effectiveTotalPower ||
    cabildeo.voteTotals.total ||
    cabildeo.positionCounts.total
  if (!total) return undefined

  const winning =
    cabildeo.outcome?.breakdown
      .map(item => item.effectiveVotes)
      .sort((left, right) => right - left)[0] ||
    cabildeo.optionSummary
      .map(item => item.votes)
      .sort((left, right) => right - left)[0]

  if (!winning) return undefined
  return winning / total
}

function getPromotedBy(
  cabildeo: Awaited<ReturnType<typeof mapCabildeosToView>>[number],
): PolicyItem['promotedBy'] {
  if (cabildeo.region) {
    return 'State'
  }
  if (cabildeo.community) {
    return 'Community'
  }
  return 'Recommended'
}
