import {msg} from '@lingui/core/macro'

import {PERSONAL_ITEM_KIND_COLORS} from '#/features/civicTree/colors'
import {
  arrangeCivicMapClusters,
  CIVIC_FIELDS,
  civicFieldForItem,
  type CivicMapLayout,
  type MapCluster as BaseMapCluster,
  type MapGrouping,
  normalizeText,
} from '#/features/civicTree/map'
import {type PersonalTreeGraph, type PersonalTreeNode} from './graph'

export type MapCluster = BaseMapCluster<PersonalTreeNode>
export type PersonalMapLayout = CivicMapLayout<PersonalTreeNode>

export const ITEM_KIND_LABELS: Record<string, ReturnType<typeof msg>> = {
  topic: msg`Topics`,
  policy: msg`Policies`,
  evidence: msg`Evidence`,
  post: msg`Posts`,
  link: msg`Links`,
  book: msg`Books`,
  note: msg`Notes`,
}

export function matchesCivicTreeSearch(node: PersonalTreeNode, search: string) {
  return normalizeText(
    [
      node.title,
      node.metadata.item.description,
      node.metadata.item.note,
      node.metadata.collectionName,
    ].join(' '),
  ).includes(normalizeText(search))
}
export function buildCivicMapLayout(
  graph: PersonalTreeGraph,
  grouping: MapGrouping,
  search: string,
  label: (descriptor: ReturnType<typeof msg>) => string,
): PersonalMapLayout {
  const query = normalizeText(search)
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
        (!query || normalizeText(group.name).includes(query))
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
