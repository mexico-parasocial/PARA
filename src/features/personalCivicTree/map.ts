import {msg} from '@lingui/core/macro'

import {FLAIR_GROUPS} from '#/lib/tags'
import {type CivicTreeItem} from '#/state/queries/collection-items'
import {PERSONAL_ITEM_KIND_COLORS} from '#/features/civicTree/colors'
import {type PersonalTreeGraph, type PersonalTreeNode} from './graph'

export type MapGrouping = 'collection' | 'type' | 'size' | 'axis'
export const MAP_GROUPINGS = [
  {id: 'collection', label: msg`Collections`},
  {id: 'type', label: msg`Data type`},
  {id: 'size', label: msg`Information size`},
  {id: 'axis', label: msg`Civic field`},
] as const

export const CIVIC_FIELDS = [
  {
    id: 'public-services',
    group: '1. SERVICIOS PÚBLICOS',
    label: msg`Public services`,
  },
  {id: 'finance', group: '2. HACIENDA', label: msg`Public finance`},
  {id: 'economy', group: '3. ECONOMÍA', label: msg`Economy`},
  {id: 'social', group: '4. ASUNTOS SOCIALES', label: msg`Social affairs`},
  {id: 'foreign', group: '5. ASUNTOS EXTERIORES', label: msg`Foreign affairs`},
  {id: 'interior', group: '6. INTERIOR', label: msg`Interior`},
] as const

export const ITEM_KIND_LABELS: Record<string, ReturnType<typeof msg>> = {
  topic: msg`Topics`,
  policy: msg`Policies`,
  evidence: msg`Evidence`,
  post: msg`Posts`,
  link: msg`Links`,
  book: msg`Books`,
  note: msg`Notes`,
}

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

export function matchesCivicTreeSearch(node: PersonalTreeNode, search: string) {
  return normalize(
    [
      node.title,
      node.metadata.item.description,
      node.metadata.item.note,
      node.metadata.collectionName,
    ].join(' '),
  ).includes(normalize(search))
}
const flairFields = new Map<string, string>()
for (const groups of Object.values(FLAIR_GROUPS)) {
  for (const field of CIVIC_FIELDS) {
    const flairs = groups[field.group] ?? []
    for (const flair of flairs) {
      for (const value of [flair.id, flair.tag, flair.label])
        flairFields.set(normalize(value), field.id)
    }
  }
}

/** Only use explicit filing metadata, never guess an axis from prose. */
export function civicFieldForItem(item: CivicTreeItem): string | undefined {
  for (const value of [item.flairId, item.policyCategory]) {
    if (!value) continue
    const key = normalize(value)
    const field =
      flairFields.get(key) ??
      CIVIC_FIELDS.find(f => [f.id, f.group].some(v => normalize(v) === key))
        ?.id
    if (field) return field
  }
  return undefined
}

export type MapCluster<Node = PersonalTreeNode> = {
  id: string
  label: string
  section?: string
  color: string
  collectionIds: string[]
  nodes: Node[]
  x: number
  y: number
  radius: number
}
export type CivicMapLayout<Node = PersonalTreeNode> = {
  clusters: MapCluster<Node>[]
  nodes: {node: Node; x: number; y: number; clusterId: string}[]
  width: number
  height: number
}

export function buildCivicMapLayout(
  graph: PersonalTreeGraph,
  grouping: MapGrouping,
  search: string,
  label: (descriptor: ReturnType<typeof msg>) => string,
): CivicMapLayout {
  const query = normalize(search)
  const clusters = new Map<string, MapCluster>()
  const add = (
    id: string,
    name: string,
    color: string,
    collectionId: string,
    node?: PersonalTreeNode,
    section?: string,
  ) => {
    let cluster = clusters.get(id)
    if (!cluster) {
      cluster = {
        id,
        label: name,
        color,
        section,
        collectionIds: [],
        nodes: [],
        x: 0,
        y: 0,
        radius: 0,
      }
      clusters.set(id, cluster)
    }
    if (!cluster.collectionIds.includes(collectionId))
      cluster.collectionIds.push(collectionId)
    if (node) cluster.nodes.push(node)
  }
  const collectionById = new Map(graph.groups.map(g => [g.id, g]))
  // Group topics and their directly connected artifacts under the same field.
  // Conflicting or absent metadata stays in Unassigned rather than inventing a classification.
  const explicitFields = new Map(
    graph.nodes.map(n => [n.id, civicFieldForItem(n.metadata.item)]),
  )
  const adjacentFields = new Map<string, Set<string>>()
  for (const edge of graph.edges) {
    for (const [source, target] of [
      [edge.source, edge.target],
      [edge.target, edge.source],
    ]) {
      const field = explicitFields.get(source)
      if (!field) continue
      const fields = adjacentFields.get(target) ?? new Set<string>()
      fields.add(field)
      adjacentFields.set(target, fields)
    }
  }
  for (const node of graph.nodes) {
    const group = collectionById.get(node.group)!
    if (query && !matchesCivicTreeSearch(node, search)) continue
    if (grouping === 'type') {
      add(
        node.metadata.kind,
        label(ITEM_KIND_LABELS[node.metadata.kind] ?? msg`Other`),
        node.color,
        node.group,
        node,
      )
    } else if (grouping === 'axis') {
      const adjacent = adjacentFields.get(node.id)
      const fieldId =
        explicitFields.get(node.id) ??
        (adjacent?.size === 1 ? [...adjacent][0] : undefined)
      const index = CIVIC_FIELDS.findIndex(f => f.id === fieldId)
      const field = CIVIC_FIELDS[index]
      add(
        field?.id ?? 'unassigned',
        label(field?.label ?? msg`Unassigned`),
        field
          ? Object.values(PERSONAL_ITEM_KIND_COLORS)[index]
          : PERSONAL_ITEM_KIND_COLORS.note,
        node.group,
        node,
      )
    } else {
      add(
        group.id,
        group.name,
        group.color,
        group.id,
        node,
        grouping === 'size' ? sizeLabel(group.itemCount, label) : undefined,
      )
    }
  }
  if (grouping === 'collection' || grouping === 'size') {
    for (const group of graph.groups) {
      if (
        group.itemCount === 0 &&
        (!query || normalize(group.name).includes(query))
      ) {
        add(
          group.id,
          group.name,
          group.color,
          group.id,
          undefined,
          grouping === 'size' ? sizeLabel(0, label) : undefined,
        )
      }
    }
  }
  const ordered = [...clusters.values()]
  if (grouping === 'size')
    ordered.sort(
      (a, b) =>
        b.nodes.length - a.nodes.length || a.label.localeCompare(b.label),
    )
  return arrangeCivicMapClusters(ordered)
}

/** Shared spatial layout; each tree supplies its own data and grouping rules. */
export function arrangeCivicMapClusters<Node>(
  clusters: MapCluster<Node>[],
): CivicMapLayout<Node> {
  const ordered = clusters.map(cluster => ({...cluster}))
  const columns = Math.max(1, Math.round(Math.sqrt(ordered.length * 1.4)))
  const radii = ordered.map(
    c => 100 + Math.ceil(Math.sqrt(c.nodes.length)) * 17,
  )
  const cell = Math.max(300, ...radii.map(r => r * 2 + 70))
  const nodes: CivicMapLayout<Node>['nodes'] = []
  ordered.forEach((cluster, index) => {
    cluster.x = ((index % columns) + 0.5) * cell
    cluster.y = (Math.floor(index / columns) + 0.5) * cell
    cluster.radius = radii[index]
    cluster.nodes.forEach((node, ni) => {
      // A sunflower distribution avoids stacked rings and scales to large collections.
      const angle = ni * Math.PI * (3 - Math.sqrt(5))
      const radius =
        Math.sqrt((ni + 0.5) / Math.max(cluster.nodes.length, 1)) *
        (cluster.radius - 45)
      nodes.push({
        node,
        clusterId: cluster.id,
        x: cluster.x + Math.cos(angle) * radius,
        y: cluster.y + 22 + Math.sin(angle) * radius,
      })
    })
  })
  return {
    clusters: ordered,
    nodes,
    width: columns * cell,
    height: Math.max(1, Math.ceil(ordered.length / columns)) * cell,
  }
}

function sizeLabel(
  count: number,
  label: (descriptor: ReturnType<typeof msg>) => string,
) {
  return label(
    count > 30
      ? msg`Large · 31+ items`
      : count > 10
        ? msg`Medium · 11–30 items`
        : msg`Small · 0–10 items`,
  )
}

export type MapCamera = {x: number; y: number; scale: number}
export function zoomMapCamera(
  camera: MapCamera,
  scale: number,
  anchor: {x: number; y: number},
): MapCamera {
  const next = Math.max(0.15, Math.min(3, scale))
  const ratio = next / camera.scale
  return {
    scale: next,
    x: anchor.x - (anchor.x - camera.x) * ratio,
    y: anchor.y - (anchor.y - camera.y) * ratio,
  }
}
