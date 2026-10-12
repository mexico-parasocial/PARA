/*
 * Which node labels a map can show without them colliding.
 *
 * The maps used to label every node at once above a zoom threshold, which
 * gave two bad states: no labels at the zoom the map opens at, and a pile of
 * overlapping, truncated labels past it. Here labels are placed greedily in
 * priority order. Each label tries below its node, then beside it, then
 * above; one with nowhere to go without overlapping another label - or
 * sitting on top of another node - is dropped. Zooming in spreads the nodes
 * apart, so more labels fit; nothing switches on at an arbitrary scale.
 *
 * Everything is in screen pixels, after the camera transform, because that
 * is where overlap is visible.
 */

export type LabelCandidate = {
  id: string
  /** Node centre on screen. */
  x: number
  y: number
  /** Node radius on screen. */
  r: number
  text: string
  /** Higher is placed first. */
  priority: number
  /** Placed regardless of collisions: the selected node. */
  force?: boolean
}

export type LabelSide = 'below' | 'right' | 'left' | 'above'

export type PlacedLabel = {
  id: string
  side: LabelSide
  /** Top-left of the label box on screen. */
  left: number
  top: number
  width: number
}

export type LabelBox = {
  left: number
  top: number
  right: number
  bottom: number
}

export type LabelOptions = {
  /** Visible area; a label must fit inside it entirely. */
  viewport: {width: number; height: number}
  /** Other text already on the map, such as cluster titles. */
  obstacles?: LabelBox[]
  /** Approximate advance of one character at the label font size. */
  charWidth?: number
  lineHeight?: number
  maxWidth?: number
  /** Space between the node and its label, and around each label. */
  gap?: number
}

/** Below reads best; beside keeps the label on the node's line; above last. */
const SIDES: LabelSide[] = ['below', 'right', 'left', 'above']

type Box = LabelBox

const overlaps = (a: Box, b: Box) =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom

export function placeMapLabels(
  candidates: LabelCandidate[],
  {
    viewport,
    obstacles = [],
    charWidth = 6.4,
    lineHeight = 16,
    maxWidth = 130,
    gap = 4,
  }: LabelOptions,
): Map<string, PlacedLabel> {
  const placed = new Map<string, PlacedLabel>()
  const taken: Box[] = [...obstacles]

  /*
   * Nodes are obstacles too: a label drawn across a dot hides it. A node's
   * own circle is skipped when its label is tested, since the label is
   * placed just clear of it.
   */
  const nodeBoxes = candidates.map(c => ({
    id: c.id,
    box: {left: c.x - c.r, top: c.y - c.r, right: c.x + c.r, bottom: c.y + c.r},
  }))

  const ordered = [...candidates].sort(
    (a, b) =>
      Number(!!b.force) - Number(!!a.force) ||
      b.priority - a.priority ||
      a.id.localeCompare(b.id),
  )

  for (const c of ordered) {
    const text = c.text.trim()
    if (!text) continue
    const width = Math.min(maxWidth, Math.ceil(text.length * charWidth) + 8)

    const boxFor = (side: LabelSide): Box => {
      switch (side) {
        case 'below':
          return {
            left: c.x - width / 2,
            top: c.y + c.r + gap,
            right: c.x + width / 2,
            bottom: c.y + c.r + gap + lineHeight,
          }
        case 'above':
          return {
            left: c.x - width / 2,
            top: c.y - c.r - gap - lineHeight,
            right: c.x + width / 2,
            bottom: c.y - c.r - gap,
          }
        case 'right':
          return {
            left: c.x + c.r + gap,
            top: c.y - lineHeight / 2,
            right: c.x + c.r + gap + width,
            bottom: c.y + lineHeight / 2,
          }
        case 'left':
          return {
            left: c.x - c.r - gap - width,
            top: c.y - lineHeight / 2,
            right: c.x - c.r - gap,
            bottom: c.y + lineHeight / 2,
          }
      }
    }

    const fits = (box: Box) => {
      /* A clipped label reads as a different word; it must fit whole. */
      const inside =
        box.left >= 0 &&
        box.right <= viewport.width &&
        box.top >= 0 &&
        box.bottom <= viewport.height
      if (!inside) return false
      const padded = {
        left: box.left - gap,
        top: box.top - gap / 2,
        right: box.right + gap,
        bottom: box.bottom + gap / 2,
      }
      if (taken.some(t => overlaps(padded, t))) return false
      return !nodeBoxes.some(n => n.id !== c.id && overlaps(box, n.box))
    }

    /* A forced label still prefers a free side, but takes below if none is. */
    const side =
      SIDES.find(sd => fits(boxFor(sd))) ?? (c.force ? 'below' : undefined)
    if (!side) continue
    const box = boxFor(side)
    taken.push(box)
    placed.set(c.id, {id: c.id, side, left: box.left, top: box.top, width})
  }

  return placed
}
