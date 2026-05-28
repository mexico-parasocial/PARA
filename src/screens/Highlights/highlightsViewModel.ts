import {type Highlight} from '#/lib/services/highlights'
import {type HighlightData} from '#/state/highlights/highlightTypes'

export type HighlightScope = 'signals' | 'map' | 'saved' | 'mine'
export type HighlightSort = 'recent' | 'popular' | 'saved'

export type HighlightRouteFilters = {
  community?: string
  state?: string
  subject?: string
  creator?: string
}

export type HighlightCardView = Highlight & {
  source: 'public' | 'local'
  signalScore: number
  savedLocally: boolean
  creatorDid?: string
}

export type HighlightSignalSummary = {
  key: string
  label: string
  count: number
  color: string
  kind: 'community' | 'state'
}

const SAVED_HIGHLIGHT_PREFIX = 'saved:'

export function savedHighlightId(highlightId: string) {
  return `${SAVED_HIGHLIGHT_PREFIX}${highlightId}`
}

export function originalHighlightId(savedId: string) {
  return savedId.startsWith(SAVED_HIGHLIGHT_PREFIX)
    ? savedId.slice(SAVED_HIGHLIGHT_PREFIX.length)
    : savedId
}

export function buildHighlightCardViews({
  publicHighlights,
  localHighlights,
  savedIds,
  viewerDid,
}: {
  publicHighlights: Highlight[]
  localHighlights: HighlightData[]
  savedIds: Set<string>
  viewerDid?: string
}): HighlightCardView[] {
  const publicViews = publicHighlights.map(highlight => ({
    ...highlight,
    source: 'public' as const,
    signalScore: getSignalScore(highlight),
    savedLocally: savedIds.has(highlight.id),
  }))

  const localViews = localHighlights
    .filter(highlight => highlight.id.startsWith(SAVED_HIGHLIGHT_PREFIX))
    .map(highlight => localHighlightToCard(highlight, viewerDid))

  return [...publicViews, ...localViews]
}

export function getHighlightsForScope(
  highlights: HighlightCardView[],
  scope: HighlightScope,
  viewerDid?: string,
) {
  switch (scope) {
    case 'saved':
      return highlights.filter(item => item.savedLocally || item.source === 'local')
    case 'mine':
      return highlights.filter(item => item.creatorDid && item.creatorDid === viewerDid)
    case 'map':
    case 'signals':
    default:
      return highlights.filter(item => item.source === 'public')
  }
}

export function filterHighlightCards({
  highlights,
  query,
  verifiedOnly,
  activeFilters,
  routeFilters,
}: {
  highlights: HighlightCardView[]
  query: string
  verifiedOnly: boolean
  activeFilters: string[]
  routeFilters: HighlightRouteFilters
}) {
  const normalizedQuery = query.trim().toLowerCase()
  const normalizedActiveFilters = activeFilters.map(filter =>
    filter.toLowerCase(),
  )

  return highlights.filter(highlight => {
    const matchesQuery =
      normalizedQuery.length === 0 ||
      [
        highlight.text,
        highlight.postPreview,
        highlight.postAuthor,
        highlight.authorName,
        highlight.community,
        highlight.state,
        highlight.party,
      ]
        .filter(Boolean)
        .some(value => value?.toLowerCase().includes(normalizedQuery))

    const matchesVerified = !verifiedOnly || highlight.isVerified
    const matchesActiveFilters =
      normalizedActiveFilters.length === 0 ||
      normalizedActiveFilters.some(filter =>
        [highlight.community, highlight.state, highlight.party]
          .filter(Boolean)
          .some(value => value?.toLowerCase() === filter),
      )
    const matchesRouteCommunity =
      !routeFilters.community ||
      highlight.community.toLowerCase() === routeFilters.community.toLowerCase()
    const matchesRouteState =
      !routeFilters.state ||
      highlight.state.toLowerCase() === routeFilters.state.toLowerCase()
    const matchesSubject =
      !routeFilters.subject || highlight.sourcePostUri === routeFilters.subject
    const matchesCreator =
      !routeFilters.creator || highlight.creatorDid === routeFilters.creator

    return (
      matchesQuery &&
      matchesVerified &&
      matchesActiveFilters &&
      matchesRouteCommunity &&
      matchesRouteState &&
      matchesSubject &&
      matchesCreator
    )
  })
}

export function sortHighlightCards(
  highlights: HighlightCardView[],
  sort: HighlightSort,
) {
  const sorted = [...highlights]
  switch (sort) {
    case 'popular':
      return sorted.sort((a, b) => b.signalScore - a.signalScore)
    case 'saved':
      return sorted.sort((a, b) => b.saves - a.saves)
    case 'recent':
    default:
      return sorted.sort((a, b) => b.createdAt - a.createdAt)
  }
}

export function getSignalSummaries(highlights: HighlightCardView[]) {
  const byCommunity = new Map<string, HighlightSignalSummary>()
  const byState = new Map<string, HighlightSignalSummary>()

  for (const highlight of highlights.filter(item => item.source === 'public')) {
    addSummary(byCommunity, {
      key: `community:${highlight.community}`,
      label: highlight.community || 'Unknown community',
      color: getPrimaryColor(highlight.color),
      kind: 'community',
    })
    if (highlight.state && highlight.state !== 'Unknown') {
      addSummary(byState, {
        key: `state:${highlight.state}`,
        label: highlight.state,
        color: getPrimaryColor(highlight.color),
        kind: 'state',
      })
    }
  }

  return [...byCommunity.values(), ...byState.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
}

function addSummary(
  map: Map<string, HighlightSignalSummary>,
  item: Omit<HighlightSignalSummary, 'count'>,
) {
  const current = map.get(item.key)
  if (current) {
    current.count += 1
  } else {
    map.set(item.key, {...item, count: 1})
  }
}

function localHighlightToCard(
  highlight: HighlightData,
  viewerDid?: string,
): HighlightCardView {
  return {
    id: originalHighlightId(highlight.id),
    sourcePostUri: highlight.postUri,
    start: highlight.start,
    end: highlight.end,
    text: highlight.text,
    postAuthor: 'local',
    authorName: 'Saved highlight',
    avatarUrl: 'https://i.pravatar.cc/150',
    postPreview: highlight.text,
    color: highlight.color,
    community: highlight.tag || 'Saved',
    state: 'Private',
    createdAt: highlight.createdAt,
    upvotes: 0,
    downvotes: 0,
    saves: 1,
    replyCount: 0,
    isVerified: false,
    isTrending: false,
    viewerHasSaved: true,
    source: 'local',
    signalScore: 0,
    savedLocally: true,
    creatorDid: highlight.creatorDid || viewerDid,
  }
}

function getSignalScore(highlight: Highlight) {
  return (
    highlight.upvotes -
    (highlight.downvotes || 0) +
    highlight.saves * 2 +
    (highlight.replyCount || 0) +
    (highlight.isVerified ? 10 : 0) +
    (highlight.isTrending ? 20 : 0)
  )
}

function getPrimaryColor(color: string | string[]) {
  return Array.isArray(color) ? color[0] : color || '#6B7280'
}
