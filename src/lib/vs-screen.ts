import {type CabildeoReadView} from '#/lib/api/cabildeo'
import {type ParaRaqAxisResult} from '#/lib/api/para-lexicons'
import {COMMUNITY_DATA} from '#/lib/constants/mockData'
import {RAQ_AXES} from '#/lib/mock-data'
import {
  formatCommunityName,
  normalizeCommunityPlainName,
  normalizeCommunitySlug,
} from '#/lib/strings/community-names'
import {POST_FLAIRS} from '#/lib/tags'

const DEFAULT_ENTITIES = ['p/Jalisco', 'p/CDMX'] as const

const ACTIVE_PHASES = new Set(['open', 'deliberating', 'voting'])
const RESOLVED_PHASES = new Set(['resolved', 'closed', 'passed', 'failed'])

const ENTITY_ALIASES: Record<string, string> = {
  PRI: 'p/PRI',
  PAN: 'p/PAN',
  MORENA: 'p/Morena',
  MC: 'p/MC',
  PVEM: 'p/PVEM',
  DERECHA: 'p/PAN',
  IZQUIERDA: 'p/Morena',
}

const PHASE_LABELS: Record<string, string> = {
  draft: 'Borrador',
  open: 'Abierto',
  deliberating: 'Deliberando',
  voting: 'Votacion',
  resolved: 'Resuelto',
}

export const VS_STATUS_FILTERS = [
  {key: 'all', label: 'Todo'},
  {key: 'active', label: 'Activos'},
  {key: 'resolved', label: 'Resueltos'},
] as const

export const VS_TIME_FILTERS = [
  {key: 'all', label: 'Todo'},
  {key: '30d', label: '30 dias'},
  {key: '90d', label: '90 dias'},
] as const

export const VS_POLICY_AXES = [
  {
    key: 'economy',
    label: 'Economia',
    keywords: [
      'economic',
      'economia',
      'economy',
      'tax',
      'impuesto',
      'market',
      'mercado',
      'salary',
      'salario',
      'budget',
      'presupuesto',
    ],
  },
  {
    key: 'welfare',
    label: 'Bienestar',
    keywords: [
      'health',
      'salud',
      'education',
      'educacion',
      'housing',
      'vivienda',
      'welfare',
      'pension',
      'care',
      'cuidados',
    ],
  },
  {
    key: 'environment',
    label: 'Ambiente',
    keywords: [
      'environment',
      'ambiente',
      'climate',
      'clima',
      'water',
      'agua',
      'energy',
      'energia',
      'transport',
      'movilidad',
      'park',
      'parque',
    ],
  },
  {
    key: 'governance',
    label: 'Gobernanza',
    keywords: [
      'governance',
      'gobierno',
      'governanza',
      'corruption',
      'corrupcion',
      'security',
      'seguridad',
      'justice',
      'justicia',
      'transparency',
      'transparencia',
    ],
  },
  {
    key: 'rights',
    label: 'Derechos',
    keywords: [
      'rights',
      'derechos',
      'liberty',
      'libertad',
      'privacy',
      'privacidad',
      'gender',
      'genero',
      'indigenous',
      'indigena',
    ],
  },
  {
    key: 'culture',
    label: 'Cultura',
    keywords: [
      'culture',
      'cultura',
      'media',
      'memes',
      'identity',
      'identidad',
      'sports',
      'deporte',
      'heritage',
      'patrimonio',
    ],
  },
] as const

export type VsStatusFilter = (typeof VS_STATUS_FILTERS)[number]['key']
export type VsTimeFilter = (typeof VS_TIME_FILTERS)[number]['key']
export type VsPolicyAxisKey = (typeof VS_POLICY_AXES)[number]['key']
export type VsAxisFilter = 'all' | VsPolicyAxisKey

export type VsTopicFilter = {
  key: string
  label: string
}

export type VsEntityOption = {
  id: string
  name: string
  plainName: string
  initials: string
  color: string
  accent: string
  subtitle: string
  group: string
  searchText: string
}

export type VsEntitySummary = {
  id: string
  name: string
  plainName: string
  initials: string
  color: string
  accent: string
  subtitle: string
  description: string
  debateCount: number
  activeCount: number
  resolvedCount: number
  sharedCount: number
  voteTotal: number
  directVoteTotal: number
  delegatedVoteTotal: number
  positionTotal: number
  participationTotal: number
  consensusRate: number
  participationShare: number
}

export type VsDebateCard = {
  uri: string
  title: string
  description: string
  community: string
  communityColor: string
  phase: string
  phaseLabel: string
  createdAt: string
  createdLabel: string
  flairs: string[]
  topics: string[]
  policyAxis: VsPolicyAxisKey
  policyAxisLabel: string
  relevantEntities: string[]
  totalVotes: number
  directVotes: number
  delegatedVotes: number
  totalPositions: number
  participationTotal: number
  consensusRate: number
  consensusLabel: string
  leadingLabel: string
  leadingMetricLabel: string
}

export type VsPolicyAxisComparison = {
  key: VsPolicyAxisKey
  label: string
  entityValues: [number, number]
  entityVoteTotals: [number, number]
  entityPositionTotals: [number, number]
  entityDebateCounts: [number, number]
  sharedDebateCount: number
  delta: number
  maxValue: number
}

export type VsRaqAxisComparison = {
  axisId: string
  title: string
  labelLow: string
  labelHigh: string
  entityScores: [number | null, number | null]
  delta: number | null
}

export type VsDivergenceRow = {
  key: string
  label: string
  kind: 'policy' | 'raq'
  entityValues: [number | null, number | null]
  delta: number
}

export type VsScreenViewModel = {
  entities: [VsEntitySummary, VsEntitySummary]
  topics: VsTopicFilter[]
  policyAxes: Array<{key: VsAxisFilter; label: string}>
  selectedTopic: string
  selectedAxis: VsAxisFilter
  selectedStatus: VsStatusFilter
  selectedTime: VsTimeFilter
  recent: VsDebateCard[]
  popular: VsDebateCard[]
  tableRows: VsDebateCard[]
  policyAxisComparisons: VsPolicyAxisComparison[]
  raqAxisComparisons: VsRaqAxisComparison[]
  divergenceRows: VsDivergenceRow[]
  totalRelevant: number
  totalVotes: number
  totalPositions: number
}

export function resolveVsEntities(
  input: string[] | string | undefined,
): [string, string] {
  const seen = new Set<string>()
  const rawEntities =
    typeof input === 'string' ? input.split(',') : input || []
  const normalized = rawEntities.reduce<string[]>((result, value) => {
    const entity = normalizeVsEntity(value)
    if (!entity) return result

    const slug = normalizeCommunitySlug(entity)
    if (seen.has(slug)) return result

    seen.add(slug)
    result.push(entity)
    return result
  }, [])

  if (normalized.length >= 2) {
    return [normalized[0], normalized[1]]
  }

  if (normalized.length === 1) {
    const fallback = DEFAULT_ENTITIES.find(item => item !== normalized[0])
    return [normalized[0], fallback || DEFAULT_ENTITIES[1]]
  }

  return [DEFAULT_ENTITIES[0], DEFAULT_ENTITIES[1]]
}

export function buildVsEntityOptions(): VsEntityOption[] {
  const seen = new Set<string>()
  return COMMUNITY_DATA.map(item => {
    const id = normalizeVsEntity(item.communityName)
    const slug = normalizeCommunitySlug(id)
    if (seen.has(slug)) return null
    seen.add(slug)
    return entityOptionFromMeta(id, {
      name: item.communityName,
      plainName: item.name,
      initials: buildInitials(item.name),
      color: item.color,
      accent: item.accent || item.color,
      subtitle: item.subtitle || item.eyebrow || 'Community',
      group:
        item.directoryGroup === 'political'
          ? 'Partidos'
          : item.directoryGroup === 'civic'
            ? 'Territorios'
            : 'Comunidades',
    })
  }).filter((option): option is VsEntityOption => Boolean(option))
}

export function setVsEntityInPair({
  entities,
  slot,
  entity,
}: {
  entities: [string, string]
  slot: 0 | 1
  entity: string
}): [string, string] {
  const normalized = normalizeVsEntity(entity)
  if (!normalized) return entities

  const otherSlot = slot === 0 ? 1 : 0
  if (
    normalizeCommunitySlug(normalized) ===
    normalizeCommunitySlug(entities[otherSlot])
  ) {
    return entities
  }

  const next: [string, string] = [...entities]
  next[slot] = normalized
  return resolveVsEntities(next)
}

export function swapVsEntities(entities: [string, string]): [string, string] {
  return [entities[1], entities[0]]
}

export function resolveInitialVsTopic(value: string | undefined) {
  if (!value) return 'all'
  return classifyTopicKey(value)
}

export function buildVsScreenViewModel({
  cabildeos,
  entities,
  selectedTopic,
  selectedAxis = 'all',
  selectedStatus = 'all',
  selectedTime = 'all',
  raqAlignments,
}: {
  cabildeos: CabildeoReadView[]
  entities: [string, string]
  selectedTopic: string
  selectedAxis?: VsAxisFilter
  selectedStatus?: VsStatusFilter
  selectedTime?: VsTimeFilter
  raqAlignments?: [
    ParaRaqAxisResult[] | undefined,
    ParaRaqAxisResult[] | undefined,
  ]
}): VsScreenViewModel {
  const relevantDebates = cabildeos
    .filter(cabildeo =>
      entities.some(entity => matchesEntity(cabildeo, entity)),
    )
    .map(cabildeo => mapVsDebateCard(cabildeo, entities))

  const topics = buildTopicFilters(relevantDebates)
  const effectiveTopic = topics.some(topic => topic.key === selectedTopic)
    ? selectedTopic
    : 'all'
  const effectiveAxis = VS_POLICY_AXES.some(axis => axis.key === selectedAxis)
    ? selectedAxis
    : 'all'
  const effectiveStatus = VS_STATUS_FILTERS.some(
    filter => filter.key === selectedStatus,
  )
    ? selectedStatus
    : 'all'
  const effectiveTime = VS_TIME_FILTERS.some(
    filter => filter.key === selectedTime,
  )
    ? selectedTime
    : 'all'

  const filteredDebates = relevantDebates.filter(card => {
    if (effectiveTopic !== 'all' && !card.topics.includes(effectiveTopic)) {
      return false
    }
    if (effectiveAxis !== 'all' && card.policyAxis !== effectiveAxis) {
      return false
    }
    if (!matchesStatus(card.phase, effectiveStatus)) {
      return false
    }
    if (!matchesTime(card.createdAt, effectiveTime)) {
      return false
    }
    return true
  })

  const recent = [...filteredDebates]
    .sort((a, b) => compareDatesDesc(a.createdAt, b.createdAt))
    .slice(0, 6)

  const recentUris = new Set(recent.map(item => item.uri))
  const popular = [...filteredDebates]
    .sort((a, b) => {
      if (b.participationTotal !== a.participationTotal) {
        return b.participationTotal - a.participationTotal
      }
      return compareDatesDesc(a.createdAt, b.createdAt)
    })
    .filter(item => !recentUris.has(item.uri))
    .slice(0, 6)

  const entitySummaries = entities.map(entity =>
    summarizeEntity({
      entity,
      entities,
      debates: filteredDebates,
    }),
  ) as [VsEntitySummary, VsEntitySummary]

  const maxParticipation = Math.max(
    entitySummaries[0].participationTotal,
    entitySummaries[1].participationTotal,
    1,
  )

  entitySummaries[0].participationShare =
    entitySummaries[0].participationTotal / maxParticipation
  entitySummaries[1].participationShare =
    entitySummaries[1].participationTotal / maxParticipation

  const policyAxisComparisons = buildPolicyAxisComparisons({
    debates: filteredDebates,
    entities,
  })
  const raqAxisComparisons = buildRaqAxisComparisons(raqAlignments)

  return {
    entities: entitySummaries,
    topics,
    policyAxes: [
      {key: 'all', label: 'Todos los ejes'},
      ...VS_POLICY_AXES.map(axis => ({key: axis.key, label: axis.label})),
    ],
    selectedTopic: effectiveTopic,
    selectedAxis: effectiveAxis,
    selectedStatus: effectiveStatus,
    selectedTime: effectiveTime,
    recent,
    popular,
    tableRows: [...filteredDebates]
      .sort((a, b) => b.participationTotal - a.participationTotal)
      .slice(0, 16),
    policyAxisComparisons,
    raqAxisComparisons,
    divergenceRows: buildDivergenceRows(
      policyAxisComparisons,
      raqAxisComparisons,
    ),
    totalRelevant: filteredDebates.length,
    totalVotes: filteredDebates.reduce((sum, card) => sum + card.totalVotes, 0),
    totalPositions: filteredDebates.reduce(
      (sum, card) => sum + card.totalPositions,
      0,
    ),
  }
}

function summarizeEntity({
  entity,
  entities,
  debates,
}: {
  entity: string
  entities: [string, string]
  debates: VsDebateCard[]
}): VsEntitySummary {
  const entitySlug = normalizeCommunitySlug(entity)
  const relatedDebates = debates.filter(card =>
    card.relevantEntities.some(
      name => normalizeCommunitySlug(name) === entitySlug,
    ),
  )
  const activeCount = relatedDebates.filter(card =>
    ACTIVE_PHASES.has(card.phase),
  ).length
  const resolvedCount = relatedDebates.filter(card =>
    RESOLVED_PHASES.has(card.phase),
  ).length
  const sharedCount = relatedDebates.filter(
    card => card.relevantEntities.length > 1,
  ).length
  const voteTotal = relatedDebates.reduce(
    (sum, card) => sum + card.totalVotes,
    0,
  )
  const directVoteTotal = relatedDebates.reduce(
    (sum, card) => sum + card.directVotes,
    0,
  )
  const delegatedVoteTotal = relatedDebates.reduce(
    (sum, card) => sum + card.delegatedVotes,
    0,
  )
  const positionTotal = relatedDebates.reduce(
    (sum, card) => sum + card.totalPositions,
    0,
  )
  const participationTotal = voteTotal + positionTotal
  const consensusSamples = relatedDebates
    .map(card => card.consensusRate)
    .filter(value => value > 0)
  const consensusRate = consensusSamples.length
    ? consensusSamples.reduce((sum, value) => sum + value, 0) /
      consensusSamples.length
    : 0

  const meta = getCommunityMeta(entity)
  const counterpart = entities.find(item => item !== entity)

  return {
    id: entity,
    name: meta.name,
    plainName: meta.plainName,
    initials: meta.initials,
    color: meta.color,
    accent: meta.accent,
    subtitle: meta.subtitle,
    description:
      relatedDebates.length > 0
        ? `${sharedCount} debates compartidos con ${
            normalizeCommunityPlainName(counterpart) || 'la red'
          }.`
        : 'Sin debates para esta entidad con el filtro actual.',
    debateCount: relatedDebates.length,
    activeCount,
    resolvedCount,
    sharedCount,
    voteTotal,
    directVoteTotal,
    delegatedVoteTotal,
    positionTotal,
    participationTotal,
    consensusRate,
    participationShare: 0,
  }
}

function mapVsDebateCard(
  cabildeo: CabildeoReadView,
  entities: [string, string],
): VsDebateCard {
  const topics = dedupe(
    (cabildeo.flairs || []).map(flair => classifyTopicKey(flair)),
  ).filter(Boolean)
  const relevantEntities = entities.filter(entity =>
    matchesEntity(cabildeo, entity),
  )
  const leading = pickLeadingOption(cabildeo)
  const normalizedVotes = cabildeo.voteTotals.total || 0
  const normalizedPositions = cabildeo.positionCounts.total || 0
  const directVotes = cabildeo.voteTotals.direct || 0
  const delegatedVotes = cabildeo.voteTotals.delegated || 0
  const participationTotal = normalizedVotes + normalizedPositions
  const meta = getCommunityMeta(cabildeo.community)
  const policyAxis = classifyPolicyAxis(cabildeo)
  const policyAxisLabel =
    VS_POLICY_AXES.find(axis => axis.key === policyAxis)?.label || 'Politica'

  return {
    uri: cabildeo.uri,
    title: cabildeo.title,
    description: cabildeo.description,
    community: cabildeo.community,
    communityColor: meta.color,
    phase: String(cabildeo.phase),
    phaseLabel: PHASE_LABELS[cabildeo.phase] || String(cabildeo.phase),
    createdAt: cabildeo.createdAt,
    createdLabel: formatShortDate(cabildeo.createdAt),
    flairs: cabildeo.flairs || [],
    topics,
    policyAxis,
    policyAxisLabel,
    relevantEntities,
    totalVotes: normalizedVotes,
    directVotes,
    delegatedVotes,
    totalPositions: normalizedPositions,
    participationTotal,
    consensusRate: leading.consensusRate,
    consensusLabel: `${Math.round(leading.consensusRate * 100)}%`,
    leadingLabel: leading.label,
    leadingMetricLabel: leading.metricLabel,
  }
}

function buildPolicyAxisComparisons({
  debates,
  entities,
}: {
  debates: VsDebateCard[]
  entities: [string, string]
}): VsPolicyAxisComparison[] {
  return VS_POLICY_AXES.map(axis => {
    const axisDebates = debates.filter(card => card.policyAxis === axis.key)
    const entityStats = entities.map(entity => {
      const entitySlug = normalizeCommunitySlug(entity)
      const related = axisDebates.filter(card =>
        card.relevantEntities.some(
          name => normalizeCommunitySlug(name) === entitySlug,
        ),
      )
      return {
        value: related.reduce((sum, card) => sum + card.participationTotal, 0),
        votes: related.reduce((sum, card) => sum + card.totalVotes, 0),
        positions: related.reduce((sum, card) => sum + card.totalPositions, 0),
        debates: related.length,
      }
    })
    const sharedDebateCount = axisDebates.filter(
      card => card.relevantEntities.length > 1,
    ).length
    const entityValues: [number, number] = [
      entityStats[0]?.value || 0,
      entityStats[1]?.value || 0,
    ]

    return {
      key: axis.key,
      label: axis.label,
      entityValues,
      entityVoteTotals: [
        entityStats[0]?.votes || 0,
        entityStats[1]?.votes || 0,
      ],
      entityPositionTotals: [
        entityStats[0]?.positions || 0,
        entityStats[1]?.positions || 0,
      ],
      entityDebateCounts: [
        entityStats[0]?.debates || 0,
        entityStats[1]?.debates || 0,
      ],
      sharedDebateCount,
      delta: Math.abs(entityValues[0] - entityValues[1]),
      maxValue: Math.max(entityValues[0], entityValues[1], 1),
    }
  })
}

function buildRaqAxisComparisons(
  raqAlignments:
    | [ParaRaqAxisResult[] | undefined, ParaRaqAxisResult[] | undefined]
    | undefined,
): VsRaqAxisComparison[] {
  return RAQ_AXES.map(axis => {
    const first = findRaqAxisResult(raqAlignments?.[0], axis.id)
    const second = findRaqAxisResult(raqAlignments?.[1], axis.id)
    const firstScore = normalizeScore(first?.score)
    const secondScore = normalizeScore(second?.score)
    return {
      axisId: axis.id,
      title: axis.title.replace(/^\d+\.\s*/, ''),
      labelLow: first?.labelLow || axis.labelLow,
      labelHigh: first?.labelHigh || axis.labelHigh,
      entityScores: [firstScore, secondScore],
      delta:
        firstScore === null || secondScore === null
          ? null
          : Math.abs(firstScore - secondScore),
    }
  })
}

function buildDivergenceRows(
  policyRows: VsPolicyAxisComparison[],
  raqRows: VsRaqAxisComparison[],
): VsDivergenceRow[] {
  const policy = policyRows.map(row => ({
    key: row.key,
    label: row.label,
    kind: 'policy' as const,
    entityValues: row.entityValues,
    delta: row.delta,
  }))
  const raq = raqRows
    .filter(row => row.delta !== null)
    .map(row => ({
      key: row.axisId,
      label: row.title,
      kind: 'raq' as const,
      entityValues: row.entityScores,
      delta: row.delta || 0,
    }))

  return [...policy, ...raq].sort((a, b) => b.delta - a.delta).slice(0, 8)
}

function findRaqAxisResult(
  results: ParaRaqAxisResult[] | undefined,
  axisId: string,
) {
  if (!results) return undefined
  const target = normalizeCommunitySlug(axisId)
  return results.find(
    result =>
      normalizeCommunitySlug(result.axisId) === target ||
      normalizeCommunitySlug(result.axisTitle) === target,
  )
}

function normalizeScore(value: number | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return null
  return Math.max(0, Math.min(100, Math.round(value)))
}

function classifyPolicyAxis(cabildeo: CabildeoReadView): VsPolicyAxisKey {
  const text = [
    cabildeo.title,
    cabildeo.description,
    cabildeo.community,
    cabildeo.region,
    ...(cabildeo.flairs || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  const match = VS_POLICY_AXES.find(axis =>
    axis.keywords.some(keyword => text.includes(keyword)),
  )

  return match?.key || 'governance'
}

function pickLeadingOption(cabildeo: CabildeoReadView) {
  const breakdown = cabildeo.outcomeSummary?.breakdown || []
  if (breakdown.length > 0) {
    const winner = [...breakdown].sort((a, b) => b.votes - a.votes)[0]
    const total = cabildeo.outcomeSummary?.effectiveTotalPower || 0
    return {
      label: winner?.label || 'Sin lider',
      consensusRate: total > 0 ? (winner?.votes || 0) / total : 0,
      metricLabel: `${winner?.votes || 0} votos efectivos`,
    }
  }

  const optionSummary = cabildeo.optionSummary || []
  if (optionSummary.length > 0) {
    const voteWinner = [...optionSummary].sort((a, b) => b.votes - a.votes)[0]
    if (voteWinner && cabildeo.voteTotals.total > 0) {
      return {
        label: voteWinner.label,
        consensusRate: voteWinner.votes / cabildeo.voteTotals.total,
        metricLabel: `${voteWinner.votes} votos`,
      }
    }

    const positionWinner = [...optionSummary].sort(
      (a, b) => b.positions - a.positions,
    )[0]
    if (positionWinner && cabildeo.positionCounts.total > 0) {
      return {
        label: positionWinner.label,
        consensusRate: positionWinner.positions / cabildeo.positionCounts.total,
        metricLabel: `${positionWinner.positions} posiciones`,
      }
    }
  }

  return {
    label: 'Sin actividad',
    consensusRate: 0,
    metricLabel: 'Sin votos',
  }
}

function buildTopicFilters(cards: VsDebateCard[]): VsTopicFilter[] {
  const counts = new Map<string, {label: string; count: number}>()
  for (const card of cards) {
    for (const key of card.topics) {
      const current = counts.get(key)
      if (current) {
        current.count += 1
      } else {
        counts.set(key, {label: labelForTopicKey(key), count: 1})
      }
    }
  }

  const dynamic = [...counts.entries()]
    .sort(
      (a, b) => b[1].count - a[1].count || a[1].label.localeCompare(b[1].label),
    )
    .map(([key, value]) => ({
      key,
      label: value.label,
    }))

  return [{key: 'all', label: 'Todo'}, ...dynamic]
}

function classifyTopicKey(value: string) {
  const normalized = value.trim()
  if (/policy/i.test(normalized)) return 'policy'
  if (/matter/i.test(normalized)) return 'matter'

  const flair = Object.values(POST_FLAIRS).find(item => item.tag === normalized)
  if (flair) return flair.id

  return normalized.toLowerCase()
}

function labelForTopicKey(key: string) {
  if (key === 'all') return 'Todo'
  if (key === 'policy') return 'Policy'
  if (key === 'matter') return 'Matter'

  const flair = Object.values(POST_FLAIRS).find(item => item.id === key)
  if (flair) return flair.label

  return key
    .replace(/^[|#]+/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase())
}

function normalizeVsEntity(value: string | undefined) {
  const raw = (value || '').trim()
  if (!raw) return ''

  const alias = ENTITY_ALIASES[raw.toUpperCase()]
  if (alias) return alias

  return formatCommunityName(raw).displayName
}

function matchesEntity(cabildeo: CabildeoReadView, entity: string) {
  const target = normalizeCommunitySlug(entity)
  const candidates = [cabildeo.community, ...(cabildeo.communities || [])]
  return candidates.some(
    candidate => normalizeCommunitySlug(candidate) === target,
  )
}

function matchesStatus(phase: string, status: VsStatusFilter) {
  if (status === 'all') return true
  if (status === 'active') return ACTIVE_PHASES.has(phase)
  return RESOLVED_PHASES.has(phase)
}

function matchesTime(createdAt: string, timeFilter: VsTimeFilter) {
  if (timeFilter === 'all') return true
  const days = timeFilter === '30d' ? 30 : 90
  const created = new Date(createdAt).getTime()
  if (Number.isNaN(created)) return true
  return Date.now() - created <= days * 86400000
}

function getCommunityMeta(entity: string) {
  const formatted = formatCommunityName(entity)
  const match = COMMUNITY_DATA.find(
    item =>
      normalizeCommunitySlug(item.communityName) === formatted.slug ||
      normalizeCommunitySlug(item.name) === formatted.slug,
  )

  if (match) {
    return {
      name: match.communityName,
      plainName: match.name,
      initials: buildInitials(match.name),
      color: match.color,
      accent: match.accent || match.color,
      subtitle: match.subtitle || match.eyebrow || 'Community',
    }
  }

  const fallbackColor = colorFromSlug(formatted.slug)
  return {
    name: formatted.displayName,
    plainName: formatted.plainName,
    initials: buildInitials(formatted.plainName),
    color: fallbackColor,
    accent: fallbackColor,
    subtitle: 'Community',
  }
}

function entityOptionFromMeta(
  id: string,
  meta: Omit<VsEntityOption, 'id' | 'searchText'>,
): VsEntityOption {
  return {
    id,
    ...meta,
    searchText: [
      id,
      meta.name,
      meta.plainName,
      meta.subtitle,
      meta.group,
    ]
      .join(' ')
      .toLowerCase(),
  }
}

function buildInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || '')
    .join('')
}

function colorFromSlug(slug: string) {
  const colors = ['#0F766E', '#1D4ED8', '#B45309', '#9333EA', '#BE123C']
  let hash = 0
  for (const char of slug) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  }
  return colors[hash % colors.length] || colors[0]
}

function formatShortDate(value: string) {
  try {
    return new Intl.DateTimeFormat('es-MX', {
      month: 'short',
      day: 'numeric',
    }).format(new Date(value))
  } catch {
    return value
  }
}

function compareDatesDesc(a: string, b: string) {
  return new Date(b).getTime() - new Date(a).getTime()
}

function dedupe(values: string[]) {
  return [...new Set(values)]
}
