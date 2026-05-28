import {type BskyAgent} from '@atproto/api'

import {
  type CabildeoAccessTier,
  type CabildeoDelegationRecord,
  type CabildeoOption,
  type CabildeoPhase,
  type CabildeoPositionRecord,
  type CabildeoRecord,
  type CabildeoVoteRecord,
  type CabildeoVoteVisibility,
} from '#/lib/api/para-lexicons'
import {issueParaVoteProof} from '#/lib/api/vote-proof'

/**
 * Cabildeo API service for writes + AppView-backed reads.
 */

// ─── Writes ──────────────────────────────────────────────────────────────────

export async function publishCabildeo(
  agent: BskyAgent,
  record: Omit<CabildeoRecord, 'author' | 'createdAt'>,
) {
  if (!agent.session) throw new Error('Not logged in')

  const now = new Date().toISOString()
  const fullRecord: CabildeoRecord = {
    ...record,
    author: agent.session.did,
    createdAt: now,
  }

  return await agent.com.atproto.repo.createRecord({
    repo: agent.session.did,
    collection: 'com.para.civic.cabildeo',
    record: fullRecord as unknown as Record<string, unknown>,
  })
}

export async function publishCabildeoPosition(
  agent: BskyAgent,
  record: Omit<CabildeoPositionRecord, 'createdAt'>,
) {
  if (!agent.session) throw new Error('Not logged in')

  return await agent.com.atproto.repo.createRecord({
    repo: agent.session.did,
    collection: 'com.para.civic.position',
    record: {
      ...record,
      createdAt: new Date().toISOString(),
    } as unknown as Record<string, unknown>,
  })
}

export async function castCabildeoVote(
  agent: BskyAgent,
  record: Omit<
    CabildeoVoteRecord,
    'createdAt' | 'delegatedFrom' | 'effectivePower'
  >,
) {
  if (!agent.session) throw new Error('Not logged in')

  const proof = await issueParaVoteProof(agent, {
    subjectUri: record.cabildeo,
    subjectType: 'cabildeo',
  })

  return await agent.call(
    'com.para.civic.castVote',
    undefined,
    {
      cabildeo: record.cabildeo,
      selectedOption: record.selectedOption,
      voteNullifier: proof?.voteNullifier,
      eligibilityProofRef: proof?.eligibilityProofRef,
    },
    {encoding: 'application/json'},
  )
}

export async function delegateCabildeoVote(
  agent: BskyAgent,
  record: Omit<CabildeoDelegationRecord, 'createdAt'>,
) {
  if (!agent.session) throw new Error('Not logged in')
  assertValidCession(record)

  return await agent.com.atproto.repo.createRecord({
    repo: agent.session.did,
    collection: 'com.para.civic.delegation',
    record: {
      ...record,
      createdAt: new Date().toISOString(),
    } as unknown as Record<string, unknown>,
  })
}

function assertValidCession(
  record: Omit<CabildeoDelegationRecord, 'createdAt'>,
) {
  const mode = record.mode ?? 'active'
  if (mode === 'active') {
    const criteriaCount =
      (typeof record.preferredOption === 'number' ? 1 : 0) +
      (record.reason?.trim() ? 1 : 0) +
      (typeof record.signal === 'number' ? 1 : 0)
    if (!record.delegateTo || !record.cabildeo || criteriaCount < 2) {
      throw new Error(
        'La cesión activa requiere voz receptora y al menos 2 piezas de criterio.',
      )
    }
    return
  }

  if (
    !record.party?.trim() ||
    !record.community?.trim() ||
    !record.scopeFlairs?.some(item => item.trim().length > 0)
  ) {
    throw new Error('La cesión pasiva requiere partido, materia y comunidad.')
  }
}

// ─── Reads (AppView) ─────────────────────────────────────────────────────────

export type CabildeoOptionSummary = {
  optionIndex: number
  label: string
  votes: number
  positions: number
}

export type CabildeoPositionCounts = {
  total: number
  for: number
  against: number
  amendment: number
  byOption: CabildeoOptionSummary[]
}

export type CabildeoVoteTotals = {
  total: number
  direct: number
  delegated: number
}

export type CabildeoOutcomeSummary = {
  winningOption?: number
  totalParticipants: number
  effectiveTotalPower: number
  tie: boolean
  breakdown: CabildeoOptionSummary[]
}

export type CabildeoViewerContext = {
  currentVoteOption?: number
  currentVoteIsDirect?: boolean
  currentVoteCreatedAt?: string
  activeDelegation?: string
  delegateHasVoted?: boolean
  delegatedVoteOption?: number
  delegatedVotedAt?: string
  gracePeriodEndsAt?: string
  delegateVoteDismissed?: boolean
}

export type CabildeoPartyVoteSummary = {
  party: string
  total: number
  byOption: number[]
}

export type GeoPointE7 = {
  latE7: number
  lngE7: number
}

export type CabildeoReadView = {
  uri: string
  cid: string
  creator: string
  indexedAt: string
  title: string
  description: string
  community: string
  communities?: string[]
  flairs?: string[]
  region?: string
  geoRestricted?: boolean
  geo?: GeoPointE7
  options: CabildeoOption[]
  minQuorum?: number
  minimumViewTier?: CabildeoAccessTier
  minimumParticipationTier?: CabildeoAccessTier
  voteVisibility?: CabildeoVoteVisibility
  partyVoteSummary?: CabildeoPartyVoteSummary[]
  phase: CabildeoPhase | (string & {})
  phaseDeadline?: string
  createdAt: string
  optionSummary: CabildeoOptionSummary[]
  positionCounts: CabildeoPositionCounts
  voteTotals: CabildeoVoteTotals
  outcomeSummary?: CabildeoOutcomeSummary
  viewerContext?: CabildeoViewerContext
}

export type CabildeoPositionReadView = {
  uri: string
  cid: string
  creator: string
  indexedAt: string
  cabildeo: string
  stance: CabildeoPositionRecord['stance']
  optionIndex?: number
  text: string
  compassQuadrant?: string
  createdAt: string
}

type ListCabildeosResponse = {
  cabildeos?: CabildeoReadView[]
  cursor?: string
}

type GetCabildeoResponse = {
  cabildeo?: CabildeoReadView
}

type ListCabildeoPositionsResponse = {
  positions?: CabildeoPositionReadView[]
  cursor?: string
}

export type DelegationCandidateReadView = {
  did: string
  handle?: string
  displayName?: string
  avatar?: string
  description?: string
  roles?: string[]
  activeDelegationCount: number
  hasVoted: boolean
  votedAt?: string
  selectedOption?: number
}

export type CabildeoDelegationMode = 'active' | 'passive'

export type CabildeoDelegationSignal = -3 | -2 | -1 | 0 | 1 | 2 | 3

type ListDelegationCandidatesResponse = {
  candidates?: DelegationCandidateReadView[]
  cursor?: string
}

const MAX_PAGINATION_PAGES = 20

export async function fetchCabildeosPage(
  agent: BskyAgent,
  opts?: {
    community?: string
    phase?: CabildeoPhase
    limit?: number
    cursor?: string
  },
): Promise<{cabildeos: CabildeoReadView[]; cursor?: string}> {
  const res = await requestCivic<ListCabildeosResponse>(
    agent,
    'com.para.civic.listCabildeos',
    {
      community: opts?.community,
      phase: opts?.phase,
      limit: opts?.limit ? String(opts.limit) : undefined,
      cursor: opts?.cursor,
    },
  )
  return {
    cabildeos: res.cabildeos ?? [],
    cursor: res.cursor,
  }
}

export async function fetchCabildeos(
  agent: BskyAgent,
  opts?: {
    community?: string
    phase?: CabildeoPhase
    limit?: number
  },
): Promise<CabildeoReadView[]> {
  const pageLimit = opts?.limit ?? 50
  const all: CabildeoReadView[] = []
  let cursor: string | undefined

  for (let page = 0; page < MAX_PAGINATION_PAGES; page++) {
    const result = await fetchCabildeosPage(agent, {
      community: opts?.community,
      phase: opts?.phase,
      limit: pageLimit,
      cursor,
    })
    all.push(...result.cabildeos)
    if (!result.cursor) break
    cursor = result.cursor
  }

  return all
}

export async function fetchCabildeo(
  agent: BskyAgent,
  cabildeoUri: string,
): Promise<CabildeoReadView | null> {
  try {
    const res = await agent.call('com.para.civic.getCabildeo', {
      cabildeo: cabildeoUri,
    })
    return (res.data as GetCabildeoResponse).cabildeo ?? null
  } catch (err: unknown) {
    const error =
      err && typeof err === 'object'
        ? (err as {error?: string; message?: string})
        : null
    if (error?.error === 'NotFound') {
      return null
    }
    throw new Error(error?.message || 'Unable to fetch cabildeo.')
  }
}

export async function fetchCabildeoPositionsPage(
  agent: BskyAgent,
  opts: {
    cabildeoUri: string
    stance?: CabildeoPositionRecord['stance']
    limit?: number
    cursor?: string
  },
): Promise<{positions: CabildeoPositionReadView[]; cursor?: string}> {
  const res = await requestCivic<ListCabildeoPositionsResponse>(
    agent,
    'com.para.civic.listCabildeoPositions',
    {
      cabildeo: opts.cabildeoUri,
      stance: opts.stance,
      limit: opts.limit ? String(opts.limit) : undefined,
      cursor: opts.cursor,
    },
  )

  return {
    positions: res.positions ?? [],
    cursor: res.cursor,
  }
}

export async function fetchCabildeoPositions(
  agent: BskyAgent,
  opts: {
    cabildeoUri: string
    stance?: CabildeoPositionRecord['stance']
    limit?: number
  },
): Promise<CabildeoPositionReadView[]> {
  const pageLimit = opts.limit ?? 50
  const all: CabildeoPositionReadView[] = []
  let cursor: string | undefined

  for (let page = 0; page < MAX_PAGINATION_PAGES; page++) {
    const result = await fetchCabildeoPositionsPage(agent, {
      cabildeoUri: opts.cabildeoUri,
      stance: opts.stance,
      limit: pageLimit,
      cursor,
    })
    all.push(...result.positions)
    if (!result.cursor) break
    cursor = result.cursor
  }

  return all
}

export async function fetchDelegationCandidates(
  agent: BskyAgent,
  opts: {
    cabildeoUri: string
    communityId?: string
    limit?: number
    cursor?: string
  },
): Promise<{candidates: DelegationCandidateReadView[]; cursor?: string}> {
  const res = await requestCivic<ListDelegationCandidatesResponse>(
    agent,
    'com.para.civic.listDelegationCandidates',
    {
      cabildeo: opts.cabildeoUri,
      communityId: opts.communityId,
      limit: opts.limit ? String(opts.limit) : undefined,
      cursor: opts.cursor,
    },
  )

  return {
    candidates: res.candidates ?? [],
    cursor: res.cursor,
  }
}

async function requestCivic<T>(
  agent: BskyAgent,
  endpoint: string,
  params: Record<string, string | number | undefined>,
): Promise<T> {
  const res = await agent.call(endpoint, params)
  return res.data as T
}
