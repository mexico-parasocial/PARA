import {
  type CabildeoOptionSummary,
  type CabildeoPartyVoteSummary,
  type CabildeoPositionCounts,
  type CabildeoPositionReadView,
  type CabildeoReadView,
  type CabildeoVoteTotals,
} from '#/lib/api/cabildeo'
import {
  type CabildeoPhase,
  type CabildeoPositionRecord,
  type CabildeoRecord,
} from '#/lib/api/para-lexicons'

const CABILDEO_COLLECTION = 'com.para.civic.cabildeo'

export type CabildeoView = CabildeoRecord & {
  uri: string
  optionSummary: CabildeoOptionSummary[]
  partyVoteSummary?: CabildeoPartyVoteSummary[]
  positionCounts: CabildeoPositionCounts
  voteTotals: CabildeoVoteTotals
}

const EMPTY_POSITION_COUNTS: CabildeoPositionCounts = {
  total: 0,
  for: 0,
  against: 0,
  amendment: 0,
  byOption: [],
}

const EMPTY_VOTE_TOTALS: CabildeoVoteTotals = {
  total: 0,
  direct: 0,
  delegated: 0,
}

export function getCabildeoUri(
  cabildeo: CabildeoRecord & {uri?: string},
  index: number,
) {
  if (typeof cabildeo.uri === 'string' && cabildeo.uri.length > 0) {
    return cabildeo.uri
  }
  const author = cabildeo.author || 'did:plc:unknown'
  return `at://${author}/${CABILDEO_COLLECTION}/${index + 1}`
}

export function mapCabildeosToView(
  records: Array<CabildeoReadView | (CabildeoRecord & {uri?: string})>,
): CabildeoView[] {
  return records.map((record, index) => {
    if (isCabildeoReadView(record)) {
      return mapCabildeoReadViewToView(record)
    }
    return {
      ...record,
      uri: getCabildeoUri(record, index),
      optionSummary: [],
      positionCounts: EMPTY_POSITION_COUNTS,
      voteTotals: EMPTY_VOTE_TOTALS,
    } as CabildeoView
  })
}

export function mapCabildeoReadViewToView(
  view: CabildeoReadView,
): CabildeoView {
  const positionCounts = normalizePositionCounts(view.positionCounts)
  const outcome = view.outcomeSummary
    ? {
        winningOption: view.outcomeSummary.winningOption ?? -1,
        totalParticipants: view.outcomeSummary.totalParticipants,
        directVoters: view.voteTotals.direct,
        delegatedVoters: view.voteTotals.delegated,
        effectiveTotalPower: view.outcomeSummary.effectiveTotalPower,
        breakdown: view.outcomeSummary.breakdown.map(item => ({
          optionIndex: item.optionIndex,
          label: item.label,
          effectiveVotes: item.votes,
        })),
      }
    : undefined

  const hasDelegatedTo =
    view.viewerContext?.activeDelegation &&
    view.viewerContext.activeDelegation.length > 0
      ? view.viewerContext.activeDelegation
      : undefined

  const delegateVoteEvent =
    view.viewerContext?.delegateHasVoted &&
    typeof view.viewerContext.delegatedVoteOption === 'number' &&
    typeof view.viewerContext.delegatedVotedAt === 'string' &&
    view.viewerContext.delegatedVotedAt.length > 0
      ? {
          optionIndex: view.viewerContext.delegatedVoteOption,
          votedAt: view.viewerContext.delegatedVotedAt,
          isDismissed: !!view.viewerContext.delegateVoteDismissed,
        }
      : undefined

  return {
    uri: view.uri,
    title: view.title,
    description: view.description,
    createdAt: view.createdAt,
    author: view.creator,
    community: view.community,
    communities: view.communities?.length ? view.communities : undefined,
    flairs: view.flairs?.length ? view.flairs : undefined,
    region: view.region,
    geoRestricted: !!view.geoRestricted,
    options: view.options,
    minQuorum: view.minQuorum,
    minimumViewTier: view.minimumViewTier ?? 'public',
    minimumParticipationTier: view.minimumParticipationTier ?? 'signed_in',
    voteVisibility: view.voteVisibility ?? 'public',
    phase: toKnownPhase(view.phase),
    phaseDeadline: view.phaseDeadline,
    optionSummary: view.optionSummary,
    partyVoteSummary: view.partyVoteSummary,
    positionCounts,
    voteTotals: view.voteTotals,
    outcome,
    userContext:
      typeof view.viewerContext?.currentVoteOption === 'number' ||
      hasDelegatedTo ||
      delegateVoteEvent
        ? {
            viewerVoteOption: view.viewerContext?.currentVoteOption,
            viewerVoteIsDirect: view.viewerContext?.currentVoteIsDirect,
            viewerVoteCreatedAt: view.viewerContext?.currentVoteCreatedAt,
            hasDelegatedTo,
            delegateVoteEvent,
          }
        : undefined,
  }
}

export function mapCabildeoPositionsFromRead(
  positions: CabildeoPositionReadView[],
): CabildeoPositionRecord[] {
  return positions.map(position => ({
    cabildeo: position.cabildeo,
    stance: position.stance,
    optionIndex:
      typeof position.optionIndex === 'number'
        ? position.optionIndex
        : undefined,
    text: position.text,
    createdAt: position.createdAt,
    compassQuadrant: position.compassQuadrant,
  }))
}

export function normalizeCommunityName(value: string | undefined) {
  return value?.trim().replace(/^p\//i, '').toLowerCase() || ''
}

export function filterCabildeos(
  cabildeos: CabildeoView[],
  {
    communityName,
    phase,
  }: {
    communityName?: string
    phase?: CabildeoPhase | 'all'
  },
) {
  const normalizedCommunity = normalizeCommunityName(communityName)
  return cabildeos.filter(cabildeo => {
    if (phase && phase !== 'all' && cabildeo.phase !== phase) {
      return false
    }
    if (!normalizedCommunity) {
      return true
    }
    const candidates = [
      cabildeo.community,
      ...(cabildeo.communities || []),
      cabildeo.region || '',
    ]
    return candidates.some(
      candidate => normalizeCommunityName(candidate) === normalizedCommunity,
    )
  })
}

export function countCabildeosByPhase(
  cabildeos: CabildeoView[],
  communityName: string | undefined,
  phase: CabildeoPhase,
) {
  return filterCabildeos(cabildeos, {communityName, phase}).length
}

export function findCabildeoByUri(
  cabildeos: CabildeoView[],
  cabildeoUri: string,
) {
  return cabildeos.find(cabildeo => cabildeo.uri === cabildeoUri) || null
}

export function toCabildeoRouteParams(cabildeo: Pick<CabildeoView, 'uri'>) {
  return {cabildeoUri: encodeURIComponent(cabildeo.uri)}
}

export function fromCabildeoRouteParam(encodedUri: string) {
  return decodeURIComponent(encodedUri)
}

function normalizePositionCounts(
  counts: CabildeoReadView['positionCounts'],
): CabildeoPositionCounts {
  const backendCounts = counts as CabildeoPositionCounts & {
    forCount?: number
    againstCount?: number
    amendmentCount?: number
  }

  return {
    total: backendCounts.total,
    for: backendCounts.for ?? backendCounts.forCount ?? 0,
    against: backendCounts.against ?? backendCounts.againstCount ?? 0,
    amendment: backendCounts.amendment ?? backendCounts.amendmentCount ?? 0,
    byOption: backendCounts.byOption ?? [],
  }
}

function isCabildeoReadView(
  value: CabildeoReadView | (CabildeoRecord & {uri?: string}),
): value is CabildeoReadView {
  return (
    typeof (value as CabildeoReadView).cid === 'string' &&
    typeof (value as CabildeoReadView).creator === 'string' &&
    typeof (value as CabildeoReadView).indexedAt === 'string'
  )
}

function toKnownPhase(phase: string): CabildeoPhase {
  if (
    phase === 'draft' ||
    phase === 'open' ||
    phase === 'deliberating' ||
    phase === 'voting' ||
    phase === 'resolved'
  ) {
    return phase
  }
  return 'draft'
}
