import {
  type CivicTreeItem,
  type CivicTreeRelation,
  getCivicTreeItemKey,
  getCivicTreeItemKind,
  getCivicTreeItemTitle,
} from '#/state/queries/collection-items'

import {
  getCollectionColor,
  PERSONAL_ITEM_KIND_COLORS,
  PERSONAL_RELATION_COLORS,
} from '#/features/civicTree/colors'

/*
 * Deliberately depends on collection-items rather than the collections query
 * barrel: this module is pure, and the barrel pulls in TanStack Query and the
 * agent, which drags reanimated into any test that touches it.
 */
export type PersonalTreeCollection = {
  id: string
  name: string
  color?: string
  items: CivicTreeItem[]
  relations?: CivicTreeRelation[]
}

/*
 * Derives the personal civic tree graph from a user's collections.
 *
 * v1 made collections the nodes and synthesised an edge whenever two of them
 * happened to share an item. That drew a picture of the folders while hiding
 * their contents, and the edges carried no meaning the user had authored - the
 * `relations` array, which is the only place the user states what connects to
 * what, was never read.
 *
 * Here the item is the node and the relation is the edge. A collection becomes
 * colour and clustering rather than a circle of its own, which is what a
 * collection actually is: a grouping, not a claim.
 */

export type PersonalTreeNode = {
  id: string
  title: string
  color: string
  borderColor: string
  radius: number
  /** Collection id - drives both clustering and the colour legend. */
  group: string
  metadata: {
    collectionId: string
    collectionName: string
    kind: string
    /** Relations touching this node, in either direction. */
    degree: number
    item: CivicTreeItem
  }
}

export type PersonalTreeEdge = {
  id: string
  source: string
  target: string
  color: string
  strokeWidth: number
  kind: string
  note?: string
}

export type PersonalTreeGraph = {
  nodes: PersonalTreeNode[]
  edges: PersonalTreeEdge[]
  /** Collections that contributed at least one item, in display order. */
  groups: {id: string; name: string; color: string; itemCount: number}[]
  totalItems: number
  totalRelations: number
  /** Items with no relation at all. Drives the "nothing connected yet" state. */
  unconnectedCount: number
}

/** Node size grows with how connected an item is, within a readable range. */
function radiusForDegree(degree: number): number {
  return 11 + Math.min(degree * 2.5, 9)
}

export function buildPersonalTreeGraph(
  collections: PersonalTreeCollection[],
): PersonalTreeGraph {
  const nodes: PersonalTreeNode[] = []
  const edges: PersonalTreeEdge[] = []
  const groups: PersonalTreeGraph['groups'] = []

  /*
   * Item keys are only unique within a collection, so namespace them. Two
   * collections holding the same policy are two nodes, which is honest: the
   * user filed it twice and may relate each copy differently.
   */
  const nodeId = (collectionId: string, itemKey: string) =>
    `${collectionId}::${itemKey}`

  const degrees = new Map<string, number>()
  const relationsByCollection = new Map<string, CivicTreeRelation[]>()

  for (const collection of collections) {
    const relations = collection.relations ?? []
    relationsByCollection.set(collection.id, relations)
    for (const relation of relations) {
      for (const key of [relation.fromItemId, relation.toItemId]) {
        const id = nodeId(collection.id, key)
        degrees.set(id, (degrees.get(id) ?? 0) + 1)
      }
    }
  }

  collections.forEach((collection, index) => {
    const collectionColor = getCollectionColor(collection.color, index)
    const items = collection.items ?? []
    if (items.length === 0) return

    groups.push({
      id: collection.id,
      name: collection.name,
      color: collectionColor,
      itemCount: items.length,
    })

    for (const item of items) {
      const key = getCivicTreeItemKey(item)
      const id = nodeId(collection.id, key)
      const kind = getCivicTreeItemKind(item)
      const degree = degrees.get(id) ?? 0

      nodes.push({
        id,
        title: getCivicTreeItemTitle(item),
        /*
         * Fill carries the item kind and border carries the collection, so a
         * glance answers "what is this" and "where did I file it" at once.
         */
        color:
          PERSONAL_ITEM_KIND_COLORS[kind] ?? PERSONAL_ITEM_KIND_COLORS.note,
        borderColor: collectionColor,
        radius: radiusForDegree(degree),
        group: collection.id,
        metadata: {
          collectionId: collection.id,
          collectionName: collection.name,
          kind,
          degree,
          item,
        },
      })
    }
  })

  const nodeIds = new Set(nodes.map(n => n.id))

  for (const collection of collections) {
    for (const relation of relationsByCollection.get(collection.id) ?? []) {
      const source = nodeId(collection.id, relation.fromItemId)
      const target = nodeId(collection.id, relation.toItemId)
      /*
       * A relation can outlive the item it pointed at, since removing an item
       * does not rewrite the relations array. Drop those rather than rendering
       * an edge into empty space.
       */
      if (!nodeIds.has(source) || !nodeIds.has(target)) continue

      edges.push({
        id: relation.id,
        source,
        target,
        color: PERSONAL_RELATION_COLORS[relation.kind] ?? '#9ca3af',
        strokeWidth: 1.5,
        kind: relation.kind,
        note: relation.note,
      })
    }
  }

  const connected = new Set<string>()
  for (const edge of edges) {
    connected.add(edge.source)
    connected.add(edge.target)
  }

  return {
    nodes,
    edges,
    groups,
    totalItems: nodes.length,
    totalRelations: edges.length,
    unconnectedCount: nodes.filter(n => !connected.has(n.id)).length,
  }
}

/** Relations touching one node, with the other end resolved for display. */
export function relationsForNode(
  graph: PersonalTreeGraph,
  nodeId: string,
): {edge: PersonalTreeEdge; otherTitle: string; outgoing: boolean}[] {
  const titles = new Map(graph.nodes.map(n => [n.id, n.title]))
  const out: ReturnType<typeof relationsForNode> = []

  for (const edge of graph.edges) {
    if (edge.source === nodeId) {
      out.push({
        edge,
        otherTitle: titles.get(edge.target) ?? '',
        outgoing: true,
      })
    } else if (edge.target === nodeId) {
      out.push({
        edge,
        otherTitle: titles.get(edge.source) ?? '',
        outgoing: false,
      })
    }
  }

  return out
}
