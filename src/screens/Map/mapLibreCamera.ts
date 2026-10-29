export type Insets = {top: number; right: number; bottom: number; left: number}

export const ZERO_INSETS: Insets = {top: 0, right: 0, bottom: 0, left: 0}

/**
 * Space on each side that the map's overlay panels cover. Camera moves frame
 * their target inside the remaining area, so a selected state is not hidden
 * behind the sheet that opens for it.
 */
export function getPanelInsets(isWide: boolean): Insets {
  // Stable objects: they sit in callback dependency lists.
  return isWide ? WIDE_PANEL_INSETS : NARROW_PANEL_INSETS
}

const WIDE_PANEL_INSETS: Insets = {top: 0, right: 0, bottom: 0, left: 400}
const NARROW_PANEL_INSETS: Insets = {top: 0, right: 0, bottom: 300, left: 0}

/** Fit padding: at least `base` on every side, more where a panel covers. */
export function mergePadding(base: number, insets?: Partial<Insets>): Insets {
  return {
    top: Math.max(base, insets?.top ?? 0),
    right: Math.max(base, insets?.right ?? 0),
    bottom: Math.max(base, insets?.bottom ?? 0),
    left: Math.max(base, insets?.left ?? 0),
  }
}

/**
 * The query box around a click. Points and thin outlines are small targets, so
 * the click looks a few pixels around it; a coarse pointer (touch) gets more.
 */
export function getHitBox(
  point: {x: number; y: number},
  coarsePointer: boolean,
): [[number, number], [number, number]] {
  const pad = coarsePointer ? 14 : 6
  return [
    [point.x - pad, point.y - pad],
    [point.x + pad, point.y + pad],
  ]
}

export type RememberedCamera = {lng: number; lat: number; zoom: number}

let rememberedCamera: RememberedCamera | null = null

/**
 * Where the map last stopped. Switching map provider in Settings unmounts the
 * map; the next one opens here instead of back at the national overview.
 */
export function rememberCamera(camera: RememberedCamera) {
  rememberedCamera = camera
}

export function getRememberedCamera() {
  return rememberedCamera
}

export function forgetCamera() {
  rememberedCamera = null
}
