/**
 * Representatives Service
 *
 * Handles fetching and filtering political representatives.
 */

import {type BskyAgent} from '@atproto/api'

import {normalizeCommunityGovernance} from '#/lib/community-governance'
import {type RepresentativeItem} from '#/lib/mock-data'
import {filterRepsByState, REPRESENTATIVES} from '#/lib/mock-data'
import {normalizeRepresentative} from '#/lib/representatives/participation'
import {USE_MOCK_DATA} from './config'
import {
  type FilterParams,
  type PaginationParams,
  type ServiceResponse,
} from './types'

export interface RepresentativesQueryParams
  extends FilterParams, PaginationParams {}

type CommunityBoardListResponse = {
  boards?: Array<{
    communityId?: string
    name?: string
    slug?: string
    governanceSummary?: {
      officialCount?: number
    }
  }>
  cursor?: string
}

const GOVERNANCE_FETCH_LIMIT = 50
const NATIONAL_PARTY_BOARDS: NonNullable<CommunityBoardListResponse['boards']> =
  [
    {communityId: 'party-pan', name: 'p/PAN', slug: 'pan'},
    {communityId: 'party-pri', name: 'p/PRI', slug: 'pri'},
    {communityId: 'party-pvem', name: 'p/PVEM', slug: 'pvem'},
    {communityId: 'party-pt', name: 'p/PT', slug: 'pt'},
    {communityId: 'party-mc', name: 'p/MC', slug: 'mc'},
    {communityId: 'party-morena', name: 'p/Morena', slug: 'morena'},
  ]

/**
 * Fetch representatives with optional filtering and pagination
 */
export async function fetchRepresentatives(
  agent: BskyAgent,
  params?: RepresentativesQueryParams,
): Promise<ServiceResponse<RepresentativeItem[]>> {
  if (USE_MOCK_DATA) {
    await simulateNetworkDelay()

    let data = REPRESENTATIVES.map(normalizeRepresentative)

    // Apply state filter
    if (params?.state) {
      data = filterRepsByState(params.state).map(normalizeRepresentative)
    }

    // Apply category filter
    if (params?.category && params.category !== 'All') {
      data = data.filter(r => r.category === params.category)
    }

    // Apply pagination
    const limit = params?.limit || 20
    const start = cursorToOffset(params?.cursor)
    const total = data.length
    data = data.slice(start, start + limit)

    const nextOffset = start + data.length
    return {
      data,
      cursor: nextOffset < total ? String(nextOffset) : undefined,
    }
  }

  const representatives = await fetchRepresentativesFromGovernance(
    agent,
    params,
  )
  const limit = params?.limit || 20
  const start = cursorToOffset(params?.cursor)
  const data = representatives.slice(start, start + limit)
  const nextOffset = start + data.length

  return {
    data,
    cursor:
      nextOffset < representatives.length ? String(nextOffset) : undefined,
  }
}

/**
 * Fetch a single representative by ID
 */
export async function fetchRepresentativeById(
  agent: BskyAgent,
  id: string,
): Promise<RepresentativeItem | null> {
  if (USE_MOCK_DATA) {
    await simulateNetworkDelay()
    const representative = REPRESENTATIVES.find(r => r.id === id)
    return representative ? normalizeRepresentative(representative) : null
  }

  const representatives = await fetchRepresentativesFromGovernance(agent)
  return representatives.map(normalizeRepresentative).find(r => r.id === id) || null
}

function simulateNetworkDelay(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 100))
}

async function fetchRepresentativesFromGovernance(
  agent: BskyAgent,
  params?: RepresentativesQueryParams,
): Promise<RepresentativeItem[]> {
  const boards = dedupeBoards([
    ...(await fetchCommunityBoards(agent, params)),
    ...NATIONAL_PARTY_BOARDS,
  ])
  const representatives: RepresentativeItem[] = []

  for (const board of boards) {
    if (board.governanceSummary?.officialCount === 0) {
      continue
    }

    const governance = await fetchCommunityGovernance(agent, board)
    if (!governance) {
      continue
    }

    const state = governance.metadata?.state || params?.state || 'National'
    governance.officials.forEach((official, index) => {
      const handle = normalizeActorHandle(official.handle || official.did)
      if (!handle) return

      representatives.push(normalizeRepresentative({
        id:
          official.did ||
          `${governance.slug || board.slug || board.communityId}-${handle}-${index}`,
        did: official.did,
        name:
          official.displayName ||
          official.handle ||
          official.did ||
          official.office,
        handle,
        category: official.office,
        affiliate: governance.community || board.name || 'Community',
        state,
        municipality: governance.slug || board.slug || 'Community',
        avatarColor: colorForString(
          official.did || official.handle || official.displayName || handle,
        ),
        type: 'Community',
        avatar: official.avatar,
        description: official.mandate,
        status: official.did ? 'verified' : 'unclaimed',
        office: official.office,
        jurisdiction: state,
        source: 'Gobernanza comunitaria PARA',
      }))
    })
  }

  return dedupeRepresentatives(representatives)
}

async function fetchCommunityBoards(
  agent: BskyAgent,
  params?: RepresentativesQueryParams,
) {
  const search = new URLSearchParams()
  search.set('limit', String(GOVERNANCE_FETCH_LIMIT))
  if (params?.state && params.state !== 'All') {
    search.set('state', params.state)
  }
  if (params?.cursor) {
    search.set('cursor', params.cursor)
  }

  try {
    const res = await agent.fetchHandler(
      `/xrpc/com.para.community.listBoards?${search.toString()}`,
      {
        method: 'GET',
        headers: {
          accept: 'application/json',
        },
      },
    )

    if (!res.ok) {
      return []
    }

    const json = (await res.json()) as CommunityBoardListResponse
    return Array.isArray(json.boards) ? json.boards : []
  } catch {
    return []
  }
}

async function fetchCommunityGovernance(
  agent: BskyAgent,
  board: NonNullable<CommunityBoardListResponse['boards']>[number],
) {
  const communityName = board.name || board.slug || board.communityId
  if (!communityName) return null

  const params = new URLSearchParams()
  params.set('community', communityName)
  if (board.communityId) {
    params.set('communityId', board.communityId)
  }

  try {
    const res = await agent.fetchHandler(
      `/xrpc/com.para.community.getGovernance?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          accept: 'application/json',
        },
      },
    )

    if (!res.ok) {
      return null
    }

    return normalizeCommunityGovernance(
      await res.json(),
      communityName,
      board.communityId,
    )
  } catch {
    return null
  }
}

function normalizeActorHandle(value: string | undefined) {
  const trimmed = value?.trim()
  if (!trimmed) return ''
  return trimmed.startsWith('@') || trimmed.startsWith('did:')
    ? trimmed
    : `@${trimmed}`
}

function cursorToOffset(cursor: string | undefined) {
  const offset = Number(cursor)
  return Number.isFinite(offset) && offset > 0 ? offset : 0
}

function dedupeRepresentatives(representatives: RepresentativeItem[]) {
  const seen = new Set<string>()
  return representatives.filter(rep => {
    const key = rep.id || rep.handle
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function dedupeBoards(
  boards: NonNullable<CommunityBoardListResponse['boards']>,
) {
  const seen = new Set<string>()
  return boards.filter(board => {
    const key = board.communityId || board.slug || board.name
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function colorForString(value: string) {
  const colors = ['#2563EB', '#059669', '#D97706', '#DC2626', '#7C3AED']
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return colors[hash % colors.length]
}
