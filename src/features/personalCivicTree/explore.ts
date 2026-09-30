import {
  PERSONAL_RELATION_COLORS,
  PERSONAL_RELATION_DIRECTED,
} from '#/features/civicTree/colors'
import {
  type PersonalTreeGraph,
  relationsForNode,
} from '#/features/personalCivicTree/graph'

/*
 * Layout for the experimental "explore" view of the personal civic tree.
 *
 * The classic graph is a force simulation: good for seeing the whole shape,
 * poor for asking "what does this item connect to". Explore trades the
 * simulation for a deterministic, focus-driven layout:
 *
 *  - no focus: one island per collection, its items ringed around a hub
 *  - focus: the chosen item sits in the middle, its connections orbit it, and
 *    everything else recedes to a faint outer ring
 *
 * Positions are pure functions of (graph, focus, size), which is what lets the
 * view animate between layouts and lets this be tested without a renderer.
 */

export type ExploreRole = 'focus' | 'neighbour' | 'far' | 'island'

export type ExploreNode = {
  id: string
  title: string
  x: number
  y: number
  r: number
  color: string
  role: ExploreRole
  showLabel: boolean
}

export type ExploreEdge = {
  id: string
  source: string
  target: string
  kind: string
  color: string
  directed: boolean
  /** True for the edges around the focused item; the rest are faint. */
  emphasised: boolean
}

export type ExploreHub = {
  id: string
  name: string
  x: number
  y: number
  itemCount: number
}

export type ExploreLayout = {
  nodes: ExploreNode[]
  edges: ExploreEdge[]
  hubs: ExploreHub[]
}

export type ExploreSize = {width: number; height: number}

/** Neighbours beyond this spill onto a second orbit so labels stay legible. */
const MAX_PER_ORBIT = 10

function polar(cx: number, cy: number, radius: number, angle: number) {
  return {x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle)}
}

function nodeRadius(degree: number) {
  return 9 + Math.min(degree * 1.5, 6)
}

export function buildExploreLayout(
  graph: PersonalTreeGraph,
  focusId: string | undefined,
  {width, height}: ExploreSize,
): ExploreLayout {
  const cx = width / 2
  const cy = height / 2
  const reach = Math.max(Math.min(width, height) / 2 - 36, 60)

  const focus = focusId ? graph.nodes.find(n => n.id === focusId) : undefined
  return focus
    ? layoutFocus(graph, focus.id, cx, cy, reach)
    : layoutIslands(graph, cx, cy, reach)
}

function layoutIslands(
  graph: PersonalTreeGraph,
  cx: number,
  cy: number,
  reach: number,
): ExploreLayout {
  const nodes: ExploreNode[] = []
  const hubs: ExploreHub[] = []
  const groups = graph.groups.filter(g => g.itemCount > 0)

  /*
   * Islands sit on a ring around the middle; a single collection takes the
   * middle itself. The island ring is pulled in as islands get more numerous
   * so each keeps room for its own items.
   */
  const islandRing = groups.length <= 1 ? 0 : reach * 0.62
  const islandReach = groups.length <= 1 ? reach : reach * 0.36

  groups.forEach((group, gi) => {
    const angle = -Math.PI / 2 + (gi / Math.max(groups.length, 1)) * Math.PI * 2
    const hub = polar(cx, cy, islandRing, angle)
    hubs.push({
      id: group.id,
      name: group.name,
      x: hub.x,
      y: hub.y,
      itemCount: group.itemCount,
    })

    const members = graph.nodes.filter(n => n.group === group.id)
    const ring = Math.min(islandReach, 26 + Math.sqrt(members.length) * 16)
    members.forEach((member, mi) => {
      const a = angle + (mi / members.length) * Math.PI * 2
      const p = polar(hub.x, hub.y, members.length === 1 ? 0 : ring, a)
      nodes.push({
        id: member.id,
        title: member.title,
        x: p.x,
        y: p.y,
        r: nodeRadius(member.metadata.degree),
        color: member.color,
        role: 'island',
        showLabel: members.length <= 6,
      })
    })
  })

  const edges: ExploreEdge[] = graph.edges.map(e => ({
    id: e.id,
    source: e.source,
    target: e.target,
    kind: e.kind,
    color: PERSONAL_RELATION_COLORS[e.kind] ?? '#9ca3af',
    directed: PERSONAL_RELATION_DIRECTED[e.kind] ?? false,
    emphasised: false,
  }))

  return {nodes, edges, hubs}
}

function layoutFocus(
  graph: PersonalTreeGraph,
  focusId: string,
  cx: number,
  cy: number,
  reach: number,
): ExploreLayout {
  const focusNode = graph.nodes.find(n => n.id === focusId)!
  const relations = relationsForNode(graph, focusId)

  /* Group by kind so the same relation clusters into one arc of the orbit. */
  const ordered = [...relations].sort(
    (a, b) =>
      a.edge.kind.localeCompare(b.edge.kind) ||
      a.otherTitle.localeCompare(b.otherTitle),
  )

  const neighbourIds: string[] = []
  const edges: ExploreEdge[] = []
  for (const {edge} of ordered) {
    const other = edge.source === focusId ? edge.target : edge.source
    if (!neighbourIds.includes(other)) neighbourIds.push(other)
    edges.push({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      kind: edge.kind,
      color: PERSONAL_RELATION_COLORS[edge.kind] ?? '#9ca3af',
      directed: PERSONAL_RELATION_DIRECTED[edge.kind] ?? false,
      emphasised: true,
    })
  }

  const nodes: ExploreNode[] = [
    {
      id: focusId,
      title: focusNode.title,
      x: cx,
      y: cy,
      r: 20,
      color: focusNode.color,
      role: 'focus',
      showLabel: true,
    },
  ]

  const byId = new Map(graph.nodes.map(n => [n.id, n]))
  const orbit1 = neighbourIds.slice(0, MAX_PER_ORBIT)
  const orbit2 = neighbourIds.slice(MAX_PER_ORBIT)

  const place = (ids: string[], radius: number, offset: number) => {
    ids.forEach((id, i) => {
      const n = byId.get(id)
      if (!n) return
      const a = offset + (i / ids.length) * Math.PI * 2
      const p = polar(cx, cy, radius, a)
      nodes.push({
        id,
        title: n.title,
        x: p.x,
        y: p.y,
        r: nodeRadius(n.metadata.degree),
        color: n.color,
        role: 'neighbour',
        showLabel: true,
      })
    })
  }
  place(orbit1, reach * (orbit2.length > 0 ? 0.48 : 0.62), -Math.PI / 2)
  place(
    orbit2,
    reach * 0.82,
    -Math.PI / 2 + Math.PI / Math.max(orbit2.length, 1),
  )

  /* Everything unrelated to the focus recedes to a faint outer ring. */
  const placed = new Set(nodes.map(n => n.id))
  const far = graph.nodes.filter(n => !placed.has(n.id))
  far.forEach((n, i) => {
    const p = polar(cx, cy, reach * 1.04, (i / far.length) * Math.PI * 2)
    nodes.push({
      id: n.id,
      title: n.title,
      x: p.x,
      y: p.y,
      r: 4,
      color: n.color,
      role: 'far',
      showLabel: false,
    })
  })

  return {nodes, edges, hubs: []}
}
