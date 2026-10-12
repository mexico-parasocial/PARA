import {msg} from '@lingui/core/macro'

import {FLAIR_GROUPS} from '#/lib/tags'
import {type CivicTreeItem} from '#/state/queries/collection-items'

/*
 * Map logic shared by the personal and community civic trees: grouping
 * choices, civic fields, the cluster layout and the pan/zoom camera. Each tree
 * builds its own clusters from its own data.
 */

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

export const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

const flairFields = new Map<string, string>()
for (const groups of Object.values(FLAIR_GROUPS)) {
  for (const field of CIVIC_FIELDS) {
    const flairs = groups[field.group] ?? []
    for (const flair of flairs) {
      for (const value of [flair.id, flair.tag, flair.label])
        flairFields.set(normalizeText(value), field.id)
    }
  }
}

/** Only use explicit filing metadata, never guess an axis from prose. */
export function civicFieldForItem(item: CivicTreeItem): string | undefined {
  for (const value of [item.flairId, item.policyCategory]) {
    if (!value) continue
    const key = normalizeText(value)
    const field =
      flairFields.get(key) ??
      CIVIC_FIELDS.find(f =>
        [f.id, f.group].some(v => normalizeText(v) === key),
      )?.id
    if (field) return field
  }
  return undefined
}

export type MapCluster<Node> = {
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
export type CivicMapLayout<Node> = {
  clusters: MapCluster<Node>[]
  nodes: {node: Node; x: number; y: number; clusterId: string}[]
  width: number
  height: number
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

/** The part of the map not covered by a panel, in screen pixels. */
export type MapVisibleRect = {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Moves the camera, without changing zoom, so a point lands in the middle of
 * the visible area - but only if it is not already comfortably inside it.
 * Selecting something already in view should not make the map jump.
 */
export function cameraToShow(
  camera: MapCamera,
  point: {x: number; y: number},
  visible: MapVisibleRect,
  margin = 56,
): MapCamera {
  const sx = camera.x + point.x * camera.scale
  const sy = camera.y + point.y * camera.scale
  const inside =
    sx >= visible.x + margin &&
    sx <= visible.x + visible.width - margin &&
    sy >= visible.y + margin &&
    sy <= visible.y + visible.height - margin
  if (inside) return camera
  return {
    scale: camera.scale,
    x: visible.x + visible.width / 2 - point.x * camera.scale,
    y: visible.y + visible.height / 2 - point.y * camera.scale,
  }
}

/** A node's radius on screen: readable when zoomed out, bounded when in. */
export function screenRadius(radius: number, scale: number) {
  return Math.max(3, Math.min(18, radius * scale))
}

/** Where a cluster's title sits on screen. Node labels keep clear of it. */
export function clusterTitleBox(
  cluster: {x: number; y: number; radius: number; section?: string},
  camera: MapCamera,
) {
  const width = Math.max(
    72,
    Math.min(200, (cluster.radius * 2 + 48) * camera.scale),
  )
  const left = camera.x + cluster.x * camera.scale - width / 2
  const top = camera.y + (cluster.y - cluster.radius) * camera.scale - 36
  return {left, top, width, height: cluster.section ? 48 : 34}
}

/**
 * An arrowhead at the target end of a directed edge, in map coordinates,
 * sized to look the same at every zoom. Returns the head and the point the
 * line should stop at so it does not poke through.
 */
export function arrowFor(
  from: {x: number; y: number},
  to: {x: number; y: number},
  targetRadius: number,
  scale: number,
) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const length = 10 / scale
  const half = 4.5 / scale
  const tipX = to.x - ux * (targetRadius + 2 / scale)
  const tipY = to.y - uy * (targetRadius + 2 / scale)
  const baseX = tipX - ux * length
  const baseY = tipY - uy * length
  return {
    end: {x: baseX, y: baseY},
    points: `${tipX},${tipY} ${baseX - uy * half},${baseY + ux * half} ${
      baseX + uy * half
    },${baseY - ux * half}`,
  }
}
