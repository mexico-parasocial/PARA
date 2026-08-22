/*
 * Search across the things a user can pull into their civic tree as a node.
 *
 * Three sources, deliberately unified behind one query rather than three tabs:
 * a user thinking "housing" does not know or care whether the match will be a
 * live cabildeo, a shared flair, or a topic they have to invent. The sections
 * exist to explain a result after it appears, not to make the user choose a
 * haystack first.
 */

export type CivicNodeSource = 'policy' | 'topic'

export type CivicNodeCandidate = {
  /** Stable key - the AT-URI for a policy, `flair:<id>` for a flair topic. */
  key: string
  title: string
  /** Which civic tree item kind this becomes. */
  kind: CivicNodeSource
  /** Section header the result sits under. */
  section: string
  /** Only set for live policies. */
  uri?: string
  /** Only set for flair-backed topics. */
  flairId?: string
  color?: string
  /** Category or community, shown under the title. */
  detail?: string
}

export type PolicyOption = {
  uri: string
  title: string
  community?: string
}

export type FlairOption = {
  id: string
  label: string
  color?: string
  /** "Policy" or "Matter", plus the category it sits in. */
  group: string
  category: string
}

/**
 * Diacritic- and case-insensitive containment. PARA's flair vocabulary is in
 * Spanish, so a user typing "educacion" must match "Educación".
 */
export function normalizeForSearch(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/**
 * Ranks a match: a title that starts with the query beats one that merely
 * contains it, so "educacion" surfaces "Educación laica" above
 * "Financiación de la educación".
 */
function score(title: string, query: string): number {
  const t = normalizeForSearch(title)
  if (!query) return 0
  if (t === query) return 3
  if (t.startsWith(query)) return 2
  if (t.includes(query)) return 1
  return -1
}

export function searchCivicNodes({
  query,
  policies,
  flairs,
  limitPerSection = 8,
}: {
  query: string
  policies: PolicyOption[]
  flairs: FlairOption[]
  limitPerSection?: number
}): {
  policies: CivicNodeCandidate[]
  topics: CivicNodeCandidate[]
  /** True when the query names nothing that exists, so it can be created. */
  canCreate: boolean
} {
  const q = normalizeForSearch(query)

  const rank = <T>(
    rows: T[],
    title: (row: T) => string,
    build: (row: T) => CivicNodeCandidate,
  ): CivicNodeCandidate[] =>
    rows
      .map(row => ({row, s: score(title(row), q)}))
      .filter(({s}) => (q ? s >= 0 : true))
      .sort((a, b) => b.s - a.s)
      .slice(0, limitPerSection)
      .map(({row}) => build(row))

  const policyResults = rank(
    policies,
    p => p.title,
    p => ({
      key: p.uri,
      title: p.title,
      kind: 'policy',
      section: 'Policies',
      uri: p.uri,
      detail: p.community,
    }),
  )

  const topicResults = rank(
    flairs,
    f => f.label,
    f => ({
      key: `flair:${f.id}`,
      title: f.label,
      kind: 'topic',
      section: f.group,
      flairId: f.id,
      color: f.color,
      detail: f.category,
    }),
  )

  /*
   * Only offer to invent a topic when nothing already names the same thing.
   * Every user minting their own "Vivienda" defeats the point of a shared
   * vocabulary, and silently splits the graph.
   */
  const exact = [...policyResults, ...topicResults].some(
    c => normalizeForSearch(c.title) === q,
  )

  return {
    policies: policyResults,
    topics: topicResults,
    canCreate: q.length > 0 && !exact,
  }
}
