import {msg} from '@lingui/core/macro'

import {
  CARD_TYPE_COLORS,
  getCollectionColor,
  RELATIONSHIP_COLORS,
} from '#/features/civicTree/colors'
import {type GraphData, type GraphNode} from '#/features/civicTree/types'
import {
  arrangeCivicMapClusters,
  CIVIC_FIELDS,
  civicFieldForItem,
  type MapCluster,
  type MapGrouping,
} from '#/features/personalCivicTree/map'
import {flairIdOf} from './topics'

export type CommunityCollection = {
  id: string
  title: string
  color: string
  nodes: GraphNode[]
}

const CARD_LABELS: Record<string, ReturnType<typeof msg>> = {
  topic: msg`Topics`,
  article: msg`Articles`,
  link: msg`Links`,
  book: msg`Books`,
  research: msg`Research`,
  audio: msg`Audio`,
  video: msg`Video`,
  social: msg`Social`,
  event: msg`Events`,
  claim: msg`Claims`,
  question: msg`Questions`,
}

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

export function filterCommunityWorkspace(
  data: GraphData,
  search: string,
  cardTypes: Set<string>,
  relTypes: Set<string>,
  stances: Set<string>,
): GraphData {
  const query = normalize(search)
  const nodes = data.nodes.filter(
    node =>
      (!query ||
        normalize([node.title, node.content].join(' ')).includes(query)) &&
      (!cardTypes.size || cardTypes.has(node.card_type)) &&
      (!stances.size || (!!node.stance && stances.has(node.stance))),
  )
  const ids = new Set(nodes.map(node => node.id))
  return {
    nodes,
    edges: data.edges.filter(
      edge =>
        ids.has(edge.source) &&
        ids.has(edge.target) &&
        (!relTypes.size || relTypes.has(edge.relationship_type)),
    ),
  }
}

/** Read-only topic groupings, never private collections or invented links. */
export function buildCommunityCollections(
  data: GraphData,
  label: (descriptor: ReturnType<typeof msg>) => string,
  context: GraphData = data,
): CommunityCollection[] {
  const topics = context.nodes
    .filter(node => node.card_type === 'topic')
    .sort((a, b) => a.id.localeCompare(b.id))
  const memberships = new Map<string, Set<string>>()
  const topicIds = new Set(topics.map(node => node.id))
  for (const edge of context.edges) {
    for (const [topic, child] of [
      [edge.source, edge.target],
      [edge.target, edge.source],
    ]) {
      if (!topicIds.has(topic) || topicIds.has(child)) continue
      const ids = memberships.get(child) ?? new Set<string>()
      ids.add(topic)
      memberships.set(child, ids)
    }
  }
  const groups: CommunityCollection[] = topics
    .map((topic, index) => ({
      id: topic.id,
      title: topic.title,
      color: getCollectionColor(undefined, index),
      nodes: data.nodes.filter(
        node => node.id === topic.id || memberships.get(node.id)?.has(topic.id),
      ),
    }))
    .filter(group => group.nodes.length > 0)
  const loose = data.nodes.filter(
    node => !topicIds.has(node.id) && !memberships.has(node.id),
  )
  if (loose.length)
    groups.push({
      id: 'unassigned',
      title: label(msg`Without a topic`),
      color: CARD_TYPE_COLORS.link,
      nodes: loose,
    })
  return groups
}

function fieldForNode(node: GraphNode) {
  let metadata: Record<string, unknown> = {}
  try {
    const value: unknown = node.metadata ? JSON.parse(node.metadata) : undefined
    if (value && typeof value === 'object' && !Array.isArray(value))
      metadata = value as Record<string, unknown>
  } catch {
    // Older cards can have non-JSON metadata; leave them unclassified.
  }
  return civicFieldForItem({
    addedAt: '',
    flairId:
      typeof metadata.flairId === 'string' ? metadata.flairId : flairIdOf(node),
    policyCategory:
      typeof metadata.policyCategory === 'string'
        ? metadata.policyCategory
        : typeof metadata.category === 'string'
          ? metadata.category
          : undefined,
  })
}

export type CommunityMapNode = GraphNode & {
  color: string
  borderColor: string
  radius: number
}

export function buildCommunityMapLayout(
  data: GraphData,
  grouping: MapGrouping,
  label: (descriptor: ReturnType<typeof msg>) => string,
  context: GraphData = data,
) {
  const collections = buildCommunityCollections(data, label, context)
  const owner = new Map<string, CommunityCollection>()
  for (const collection of collections)
    for (const node of collection.nodes)
      if (!owner.has(node.id)) owner.set(node.id, collection)
  const explicit = new Map(
    context.nodes.map(node => [node.id, fieldForNode(node)]),
  )
  const adjacent = new Map<string, Set<string>>()
  const degree = new Map<string, number>()
  for (const edge of context.edges) {
    for (const [source, target] of [
      [edge.source, edge.target],
      [edge.target, edge.source],
    ]) {
      degree.set(source, (degree.get(source) ?? 0) + 1)
      const field = explicit.get(source)
      if (!field) continue
      const fields = adjacent.get(target) ?? new Set<string>()
      fields.add(field)
      adjacent.set(target, fields)
    }
  }
  const clusters = new Map<string, MapCluster<CommunityMapNode>>()
  for (const card of data.nodes) {
    const collection = owner.get(card.id)!
    const neighbours = adjacent.get(card.id)
    const fieldId =
      explicit.get(card.id) ??
      (neighbours?.size === 1 ? [...neighbours][0] : undefined)
    const fieldIndex = CIVIC_FIELDS.findIndex(field => field.id === fieldId)
    const field = CIVIC_FIELDS[fieldIndex]
    const id =
      grouping === 'type'
        ? `type:${card.card_type}`
        : grouping === 'axis'
          ? `axis:${field?.id ?? 'unassigned'}`
          : `topic:${collection.id}`
    const color =
      grouping === 'type'
        ? (CARD_TYPE_COLORS[card.card_type] ?? CARD_TYPE_COLORS.link)
        : grouping === 'axis'
          ? getCollectionColor(undefined, fieldIndex < 0 ? 0 : fieldIndex)
          : collection.color
    if (!clusters.has(id))
      clusters.set(id, {
        id,
        color,
        label:
          grouping === 'type'
            ? label(CARD_LABELS[card.card_type] ?? msg`Other`)
            : grouping === 'axis'
              ? label(field?.label ?? msg`Unassigned`)
              : collection.title,
        nodes: [],
        collectionIds: [],
        x: 0,
        y: 0,
        radius: 0,
      })
    clusters.get(id)!.nodes.push({
      ...card,
      color: CARD_TYPE_COLORS[card.card_type] ?? CARD_TYPE_COLORS.link,
      borderColor: color,
      radius: 11 + Math.min((degree.get(card.id) ?? 0) * 2.5, 9),
    })
  }
  const ordered = [...clusters.values()]
  if (grouping === 'size')
    ordered.sort(
      (a, b) =>
        b.nodes.length - a.nodes.length || a.label.localeCompare(b.label),
    )
  return arrangeCivicMapClusters(ordered)
}

export function communityEdgeColor(type: string) {
  return RELATIONSHIP_COLORS[type] ?? CARD_TYPE_COLORS.link
}
