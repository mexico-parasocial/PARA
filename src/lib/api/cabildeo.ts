import {type LexMap} from '@atproto/lex'
import {type AtUriString} from '@atproto/syntax'

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
import {
  type PublicSessionBundle,
  type SessionBundle,
} from '#/state/session/session-core'
import {com} from '#/lexicons'

/** Any `useAgent()` result: authenticated session or public (logged-out). */
export type CabildeoServiceAgent = SessionBundle | PublicSessionBundle

/**
 * Cabildeo API service for writes + AppView-backed reads.
 */

// ─── Writes ──────────────────────────────────────────────────────────────────

export async function publishCabildeo(
  agent: CabildeoServiceAgent,
  record: Omit<CabildeoRecord, 'author' | 'createdAt'>,
) {
  if (!agent.session) throw new Error('Not logged in')

  const now = new Date().toISOString()
  const fullRecord: CabildeoRecord = {
    ...record,
    author: agent.session.did,
    createdAt: now,
  }

  return await agent.pdsClient.call(com.atproto.repo.createRecord, {
    repo: agent.session.did,
    collection: 'com.para.civic.cabildeo',
    record: fullRecord as unknown as LexMap,
  })
}

export async function publishCabildeoPosition(
  agent: CabildeoServiceAgent,
  record: Omit<CabildeoPositionRecord, 'createdAt'>,
) {
  if (!agent.session) throw new Error('Not logged in')

  return await agent.pdsClient.call(com.atproto.repo.createRecord, {
    repo: agent.session.did,
    collection: 'com.para.civic.position',
    record: {
      ...record,
      createdAt: new Date().toISOString(),
    },
  })
}

export async function castCabildeoVote(
  agent: CabildeoServiceAgent,
  record: Omit<
    CabildeoVoteRecord,
    'createdAt' | 'delegatedFrom' | 'effectivePower'
  >,
) {
  if (!agent.session) throw new Error('Not logged in')

  const proof = await issueParaVoteProof(agent, {
    subjectUri: record.cabildeo,
    subjectType: 'cabildeo',
    selectedOption: record.selectedOption,
  })

  return await agent.appviewClient.call(com.para.civic.castVote, {
    cabildeo: record.cabildeo as AtUriString,
    selectedOption: record.selectedOption ?? 0,
    voteNullifier: proof.voteNullifier,
    eligibilityProofRef: proof.eligibilityProofRef,
  })
}

export async function delegateCabildeoVote(
  agent: CabildeoServiceAgent,
  record: Omit<CabildeoDelegationRecord, 'createdAt'>,
) {
  if (!agent.session) throw new Error('Not logged in')
  assertValidCession(record)

  return await agent.pdsClient.call(com.atproto.repo.createRecord, {
    repo: agent.session.did,
    collection: 'com.para.civic.delegation',
    record: {
      ...record,
      createdAt: new Date().toISOString(),
    },
  })
}

/**
 * The delegator's own cessions, read from their repo rather than the AppView:
 * the record is written there directly, so it is the only place that holds the
 * uri revoking one needs.
 */
export async function listMyCabildeoDelegations(
  agent: CabildeoServiceAgent,
  opts: {cabildeo?: string} = {},
): Promise<CabildeoDelegationEntry[]> {
  if (!agent.session) throw new Error('Not logged in')

  const res = await agent.pdsClient.call(com.atproto.repo.listRecords, {
    repo: agent.session.did,
    collection: 'com.para.civic.delegation',
    limit: 100,
  })

  return res.records
    .map(item => ({
      uri: item.uri,
      cid: item.cid,
      record: item.value as unknown as CabildeoDelegationRecord,
    }))
    .filter(entry =>
      opts.cabildeo ? entry.record.cabildeo === opts.cabildeo : true,
    )
}

/**
 * Revoking deletes the record rather than stamping `revokedAt` on it.
 *
 * Two reasons, and they agree. The AppView's `com.para.civic.delegation`
 * indexer does not read `revokedAt` at all — it recomputes a cabildeo's
 * aggregates from `deleteFn`, so a stamped record would still be counted and
 * the screen would be telling the user something untrue. And deleting is the
 * privacy-preserving option: a cession left standing as revoked keeps
 * publishing who trusted whom, which is the linkage OD-7 §5b is about.
 */
export async function revokeCabildeoDelegation(
  agent: CabildeoServiceAgent,
  uri: string,
) {
  if (!agent.session) throw new Error('Not logged in')

  const rkey = uri.split('/').pop()
  if (!rkey) throw new Error('Cesión no encontrada')

  return await agent.pdsClient.call(com.atproto.repo.deleteRecord, {
    repo: agent.session.did,
    collection: 'com.para.civic.delegation',
    rkey,
  })
}

export type CabildeoDelegationEntry = {
  uri: string
  cid: string
  record: CabildeoDelegationRecord
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

const MAX_PAGINATION_PAGES = 20

export async function fetchCabildeosPage(
  agent: CabildeoServiceAgent,
  opts?: {
    community?: string
    phase?: CabildeoPhase
    limit?: number
    cursor?: string
  },
): Promise<{cabildeos: CabildeoReadView[]; cursor?: string}> {
  const res = await agent.appviewClient.call(com.para.civic.listCabildeos, {
    community: opts?.community,
    phase: opts?.phase,
    limit: opts?.limit,
    cursor: opts?.cursor,
  })
  return {
    cabildeos: (res.cabildeos ?? []) as unknown as CabildeoReadView[],
    cursor: res.cursor,
  }
}

export async function fetchCabildeos(
  agent: CabildeoServiceAgent,
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
  agent: CabildeoServiceAgent,
  cabildeoUri: string,
): Promise<CabildeoReadView | null> {
  try {
    const res = await agent.appviewClient.call(com.para.civic.getCabildeo, {
      cabildeo: cabildeoUri as AtUriString,
    })
    return (res.cabildeo as unknown as CabildeoReadView) ?? null
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
  agent: CabildeoServiceAgent,
  opts: {
    cabildeoUri: string
    stance?: CabildeoPositionRecord['stance']
    limit?: number
    cursor?: string
  },
): Promise<{positions: CabildeoPositionReadView[]; cursor?: string}> {
  const res = await agent.appviewClient.call(
    com.para.civic.listCabildeoPositions,
    {
      cabildeo: opts.cabildeoUri as AtUriString,
      stance: opts.stance,
      limit: opts.limit,
      cursor: opts.cursor,
    },
  )

  return {
    positions: (res.positions ?? []) as unknown as CabildeoPositionReadView[],
    cursor: res.cursor,
  }
}

export async function fetchCabildeoPositions(
  agent: CabildeoServiceAgent,
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
  agent: CabildeoServiceAgent,
  opts: {
    cabildeoUri: string
    communityId?: string
    limit?: number
    cursor?: string
  },
): Promise<{candidates: DelegationCandidateReadView[]; cursor?: string}> {
  const res = await agent.appviewClient.call(
    com.para.civic.listDelegationCandidates,
    {
      cabildeo: opts.cabildeoUri as AtUriString,
      communityId: opts.communityId,
      limit: opts.limit,
      cursor: opts.cursor,
    },
  )

  return {
    candidates: (res.candidates ??
      []) as unknown as DelegationCandidateReadView[],
    cursor: res.cursor,
  }
}
