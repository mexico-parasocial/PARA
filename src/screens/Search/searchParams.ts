import {type ParaSearchPostsFilters} from '#/state/queries/search-posts'

/**
 * Structured advanced-search filters that live as sibling URL query params
 * alongside `q` (e.g. /search?q=test&domain=bsky.app). `q` itself holds only
 * free text; these params hold everything configured in the advanced search
 * dialog. All values are strings so they map cleanly to route params; `tag` is
 * space-joined here and split into the lexicon's string[] at the API boundary.
 */
export type SearchFilters = {
  author?: string
  mentions?: string
  domain?: string
  url?: string
  tag?: string
  /**
   * Exclude variants of the list fields above. v2-only; v1 has no structured
   * exclude operators so these are dropped on the legacy path.
   */
  excludeAuthor?: string
  excludeMentions?: string
  excludeDomain?: string
  excludeUrl?: string
  excludeTag?: string
  lang?: string
  since?: string
  until?: string
  /** 'none' | 'only' */
  replies?: string
  /** 'true' */
  media?: string
  /** 'true' */
  video?: string
  /** 'true' */
  following?: string
  /** PARA-specific: state geographic filter */
  state?: string
  /** PARA-specific: district geographic filter */
  districtKey?: string
  /** PARA-specific: cabildeo phase filter */
  cabildeoPhase?: string
  /** PARA-specific: post type filter */
  postType?: string
  /** PARA-specific: comma-separated flair tags */
  flairs?: string
  /** PARA-specific: political party filter */
  party?: string
  /** PARA-specific: 'true' when filtering to verified public figures */
  verifiedPublicFigure?: string
  /** PARA-specific: comma-separated community AT-URIs */
  communityUris?: string
  /** PARA-specific: comma-separated cabildeo AT-URIs */
  cabildeoUris?: string
  /** PARA-specific: comma-separated political compass position slugs */
  politicalCompassPositions?: string
}

export const FILTER_PARAM_KEYS = [
  'author',
  'mentions',
  'domain',
  'url',
  'tag',
  'excludeAuthor',
  'excludeMentions',
  'excludeDomain',
  'excludeUrl',
  'excludeTag',
  'lang',
  'since',
  'until',
  'replies',
  'media',
  'video',
  'following',
  'state',
  'districtKey',
  'cabildeoPhase',
  'postType',
  'flairs',
  'party',
  'verifiedPublicFigure',
  'communityUris',
  'cabildeoUris',
  'politicalCompassPositions',
] as const

/**
 * Reads filter params out of a route's params object, keeping only non-empty
 * string values.
 */
export function readSearchFilters(
  routeParams: Record<string, unknown> | undefined,
): SearchFilters {
  const filters: SearchFilters = {}
  if (!routeParams) return filters
  for (const key of FILTER_PARAM_KEYS) {
    const value = routeParams[key]
    /*
     * Guard against the literal string "undefined", which can leak into the
     * URL if an undefined param value gets serialized.
     */
    if (typeof value === 'string' && value && value !== 'undefined') {
      filters[key] = value
    }
  }
  return filters
}

export function hasActiveFilters(filters: SearchFilters): boolean {
  return FILTER_PARAM_KEYS.some(key => filters[key])
}

/**
 * Number of active filter params, used for the "[+N filters]" pill in search
 * history. Each set key counts once (a multi-value field like author counts as
 * one filter regardless of how many handles it holds).
 */
export function countActiveFilters(filters: SearchFilters): number {
  return FILTER_PARAM_KEYS.filter(key => filters[key]).length
}

export type SearchHistoryEntry = {
  q: string
  filters: SearchFilters
}

/**
 * Serializes a search (query text + filters) for term-history storage. Searches
 * with no filters are stored as plain strings - both for readability and so
 * pre-existing term-only history (also plain strings) stays valid. Only
 * filtered searches are JSON-encoded.
 */
export function serializeHistoryEntry(
  q: string,
  filters: SearchFilters,
): string {
  if (!hasActiveFilters(filters)) return q
  return JSON.stringify({q, filters})
}

/**
 * Parses a stored term-history entry. Legacy/term-only entries are plain
 * strings; filtered entries are JSON objects. Anything that isn't a
 * well-formed {q, filters} object is treated as a plain query string, so a bad
 * or pre-existing value never throws.
 */
export function parseHistoryEntry(stored: string): SearchHistoryEntry {
  try {
    const parsed: unknown = JSON.parse(stored)
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof (parsed as {q?: unknown}).q === 'string'
    ) {
      const obj = parsed as {q: string; filters?: Record<string, unknown>}
      return {q: obj.q, filters: readSearchFilters(obj.filters)}
    }
  } catch {
    // Not JSON - a plain term-only entry.
  }
  return {q: stored, filters: {}}
}

/**
 * Filter keys that restrict posts specifically, as opposed to `lang`, which
 * applies equally to posts, people, and feeds. Used to decide whether the
 * People/Feeds search tabs still make sense: a language alone should not hide
 * them, but any post-only filter (author, domain, media, etc.) should.
 */
const POST_ONLY_FILTER_KEYS = FILTER_PARAM_KEYS.filter(key => key !== 'lang')

export function hasPostOnlyFilters(filters: SearchFilters): boolean {
  return POST_ONLY_FILTER_KEYS.some(key => filters[key])
}

/**
 * Filter keys that the legacy v1 `app.bsky.feed.searchPosts` endpoint cannot
 * accept as structured params. If any of these are active, the search must route
 * to v2 (or PARA's own search endpoint) to avoid silently dropping filters.
 * v1 only honors `q`, `sort`, `tag`, `cursor`, and `limit`.
 */
const V2_REQUIRED_FILTER_KEYS = FILTER_PARAM_KEYS.filter(
  key => key !== 'tag' && key !== 'lang',
)

export function requiresSearchV2(filters: SearchFilters): boolean {
  return V2_REQUIRED_FILTER_KEYS.some(key => filters[key])
}

const PARA_FILTER_KEYS = [
  'postType',
  'flairs',
  'party',
  'verifiedPublicFigure',
  'state',
  'districtKey',
  'cabildeoPhase',
  'communityUris',
  'cabildeoUris',
  'politicalCompassPositions',
] as const

export function countActiveParaFilters(filters: SearchFilters): number {
  return PARA_FILTER_KEYS.filter(key => filters[key]).length
}

export function getActiveParaFilterNames(filters: SearchFilters): string[] {
  return PARA_FILTER_KEYS.filter(key => filters[key])
}

/**
 * Converts the string-based `SearchFilters` (as stored in route params) into the
 * structured `ParaSearchPostsFilters` used by `useParaSearchPostsQuery`.
 * - `tag` is split on whitespace (upstream convention).
 * - Other list fields are split on commas.
 * - `verifiedPublicFigure` becomes `true` when the route value is `'true'`.
 */
export function searchFiltersToParaFilters(
  filters: SearchFilters,
): ParaSearchPostsFilters {
  const para: ParaSearchPostsFilters = {}

  if (filters.tag) {
    const tags = filters.tag.split(/\s+/).filter(Boolean)
    if (tags.length) para.tag = tags
  }
  if (filters.flairs) {
    const flairs = filters.flairs.split(',').filter(Boolean)
    if (flairs.length) para.flairs = flairs
  }
  if (filters.communityUris) {
    const uris = filters.communityUris.split(',').filter(Boolean)
    if (uris.length) para.communityUris = uris
  }
  if (filters.cabildeoUris) {
    const uris = filters.cabildeoUris.split(',').filter(Boolean)
    if (uris.length) para.cabildeoUris = uris
  }
  if (filters.politicalCompassPositions) {
    const positions = filters.politicalCompassPositions
      .split(',')
      .filter(Boolean)
    if (positions.length) para.politicalCompassPositions = positions
  }

  if (filters.postType) para.postType = filters.postType
  if (filters.party) para.party = filters.party
  if (filters.verifiedPublicFigure === 'true') {
    para.verifiedPublicFigure = true
  }
  if (filters.state) para.state = filters.state
  if (filters.districtKey) para.districtKey = filters.districtKey
  if (filters.cabildeoPhase) para.cabildeoPhase = filters.cabildeoPhase

  return para
}

/**
 * Converts structured PARA filters back into the string-based `SearchFilters`
 * representation for route params. Inverse of `searchFiltersToParaFilters`.
 */
export function paraFiltersToSearchFilters(
  para: ParaSearchPostsFilters,
): SearchFilters {
  const filters: SearchFilters = {}

  if (para.tag?.length) filters.tag = para.tag.join(' ')
  if (para.flairs?.length) filters.flairs = para.flairs.join(',')
  if (para.communityUris?.length)
    filters.communityUris = para.communityUris.join(',')
  if (para.cabildeoUris?.length)
    filters.cabildeoUris = para.cabildeoUris.join(',')
  if (para.politicalCompassPositions?.length) {
    filters.politicalCompassPositions = para.politicalCompassPositions.join(',')
  }

  if (para.postType) filters.postType = para.postType
  if (para.party) filters.party = para.party
  if (para.verifiedPublicFigure != null) {
    filters.verifiedPublicFigure = para.verifiedPublicFigure
      ? 'true'
      : undefined
  }
  if (para.state) filters.state = para.state
  if (para.districtKey) filters.districtKey = para.districtKey
  if (para.cabildeoPhase) filters.cabildeoPhase = para.cabildeoPhase

  return filters
}

/**
 * Expands filters to a route-params object covering every filter key, with
 * absent keys set to undefined. Used with navigation.setParams (which merges)
 * so filters the user removed are cleared. NOTE: only safe on native - on web,
 * undefined values serialize into the URL as the literal string "undefined".
 * Use definedFilterParams + a fresh navigation (push/replace) on web instead.
 */
export function filtersToRouteParams(
  filters: SearchFilters,
): Record<string, string | undefined> {
  const params: Record<string, string | undefined> = {}
  for (const key of FILTER_PARAM_KEYS) {
    params[key] = filters[key] || undefined
  }
  return params
}

/**
 * Returns only the filter keys that have a value, omitting the rest entirely.
 * Safe for building a fresh URL on web - absent filters never appear.
 */
export function definedFilterParams(
  filters: SearchFilters,
): Record<string, string> {
  const params: Record<string, string> = {}
  for (const key of FILTER_PARAM_KEYS) {
    const value = filters[key]
    if (value) params[key] = value
  }
  return params
}

/**
 * Strips all filter keys from a route-params object, leaving non-filter params
 * (q, tab, name) intact. Use as the base when rebuilding a fresh param set so
 * removed filters - and any stale "undefined" strings - drop out.
 */
export function withoutFilterParams(
  routeParams: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const base: Record<string, unknown> = {...routeParams}
  for (const key of FILTER_PARAM_KEYS) {
    delete base[key]
  }
  return base
}

/**
 * Converts structured filters back into the legacy free-text operators used by
 * search v1. UI-only filters are intentionally dropped because the old path
 * could not apply them.
 */
export function filtersToLegacyParams(
  filters: SearchFilters,
): Record<string, string> {
  const params: Record<string, string> = {}
  if (filters.author) params.from = filters.author
  if (filters.mentions) params.mentions = filters.mentions
  if (filters.domain) params.domain = filters.domain
  if (filters.url) params.url = filters.url
  if (filters.tag) params.tag = filters.tag
  if (filters.lang) params.lang = filters.lang
  if (filters.since) params.since = filters.since
  if (filters.until) params.until = filters.until
  return params
}

/**
 * Maps each multi-value SearchFilters key to its `app.bsky.feed.searchPostsV2`
 * param name. Search v1 only honored the first value for the singular lexicon
 * params (author/domain/url); v2 accepts every value and renames them to the
 * plural forms here. `tag` becomes `hashtags`; `mentions` keeps its name. The
 * exclude* keys map to v2's matching exclude* params.
 */
const MULTI_VALUE_KEY_MAP = {
  author: 'authors',
  mentions: 'mentions',
  domain: 'domains',
  url: 'urls',
  tag: 'hashtags',
  excludeAuthor: 'excludeAuthors',
  excludeMentions: 'excludeMentions',
  excludeDomain: 'excludeDomains',
  excludeUrl: 'excludeUrls',
  excludeTag: 'excludeHashtags',
} as const

/**
 * Converts filters into structured params for `app.bsky.feed.searchPostsV2`.
 * Output property names match the v2 lexicon. List fields are split into arrays
 * of values; scalar fields (language/since/until) pass through. The
 * boolean/replies filters (media/video/following/replies) are v2-only - v1 had
 * no equivalent and dropped them.
 */
export function filtersToApiParams(filters: SearchFilters): {
  authors?: string[]
  mentions?: string[]
  domains?: string[]
  urls?: string[]
  hashtags?: string[]
  excludeAuthors?: string[]
  excludeMentions?: string[]
  excludeDomains?: string[]
  excludeUrls?: string[]
  excludeHashtags?: string[]
  language?: string
  since?: string
  until?: string
  hasMedia?: boolean
  hasVideo?: boolean
  following?: boolean
  excludeReplies?: boolean
  repliesOnly?: boolean
} {
  const params: ReturnType<typeof filtersToApiParams> = {}
  for (const key of Object.keys(
    MULTI_VALUE_KEY_MAP,
  ) as (keyof typeof MULTI_VALUE_KEY_MAP)[]) {
    const raw = filters[key]
    if (!raw) continue
    const values = raw.split(/\s+/).filter(Boolean)
    if (values.length) params[MULTI_VALUE_KEY_MAP[key]] = values
  }
  if (filters.lang) params.language = filters.lang
  if (filters.since) params.since = filters.since
  if (filters.until) params.until = filters.until
  if (filters.media === 'true') params.hasMedia = true
  if (filters.video === 'true') params.hasVideo = true
  if (filters.following === 'true') params.following = true
  if (filters.replies === 'none') params.excludeReplies = true
  else if (filters.replies === 'only') params.repliesOnly = true
  return params
}
