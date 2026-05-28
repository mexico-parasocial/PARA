/**
 * CANONICAL POLITICAL COMPASS COLORS
 * ====================================
 * Single source of truth for the 9 compass position colors.
 *
 * These are the "classic" pale palette used in the CompassScreen visualization.
 * Every other part of the app (CompassMini, highlights, RAQ scoring, etc.)
 * MUST import from here — never define compass colors locally.
 *
 * Grid layout:
 *   auth-left    | auth-center  | auth-right
 *   center-left  | center       | center-right
 *   lib-left     | lib-center   | lib-right
 */

/** All 9 compass position IDs in kebab-case (canonical ID format) */
export const COMPASS_POSITION_IDS = [
  'auth-left',
  'auth-center',
  'auth-right',
  'center-left',
  'center',
  'center-right',
  'lib-left',
  'lib-center',
  'lib-right',
] as const

export type CompassPositionId = (typeof COMPASS_POSITION_IDS)[number]

/**
 * The 9 standard pale political-compass background colors.
 * Indexed by compass position ID.
 */
export const COMPASS_COLORS: Record<CompassPositionId, string> = {
  'auth-left': '#efb9bb',
  'auth-center': '#cda7d8',
  'auth-right': '#99d0ea',
  'center-left': '#d8d9be',
  center: '#efe7d6',
  'center-right': '#bfd7e8',
  'lib-left': '#c7e4c2',
  'lib-center': '#dfe498',
  'lib-right': '#f6efb3',
}

/**
 * Readable text / label colors to use on top of each position's background.
 */
export const COMPASS_LABEL_COLORS: Record<CompassPositionId, string> = {
  'auth-left': '#b05e68',
  'auth-center': '#845596',
  'auth-right': '#1c87b4',
  'center-left': '#7f7950',
  center: '#6f6758',
  'center-right': '#547d98',
  'lib-left': '#4faa57',
  'lib-center': '#8c8a1a',
  'lib-right': '#c8b600',
}

/**
 * 3 × 3 row/column grid order — use this when rendering any compass grid UI.
 */
export const COMPASS_GRID_ROWS: CompassPositionId[][] = [
  ['auth-left', 'auth-center', 'auth-right'],
  ['center-left', 'center', 'center-right'],
  ['lib-left', 'lib-center', 'lib-right'],
]

/**
 * Gradient definitions for the 4 transitional (edge) cells.
 * Each gradient interpolates between the two adjacent corner colors.
 * Use these only for *display* purposes (CompassMini, CompassScreen board).
 * Stored data (highlights, affiliations) always uses the solid COMPASS_COLORS value.
 */
export const COMPASS_CROSS_GRADIENTS: Partial<
  Record<
    CompassPositionId,
    {
      colors: [string, string]
      start: {x: number; y: number}
      end: {x: number; y: number}
    }
  >
> = {
  'auth-center': {
    colors: [COMPASS_COLORS['auth-left'], COMPASS_COLORS['auth-right']],
    start: {x: 0, y: 0.5},
    end: {x: 1, y: 0.5},
  },
  'center-left': {
    colors: [COMPASS_COLORS['auth-left'], COMPASS_COLORS['lib-left']],
    start: {x: 0.5, y: 0},
    end: {x: 0.5, y: 1},
  },
  'center-right': {
    colors: [COMPASS_COLORS['auth-right'], COMPASS_COLORS['lib-right']],
    start: {x: 0.5, y: 0},
    end: {x: 0.5, y: 1},
  },
  'lib-center': {
    colors: [COMPASS_COLORS['lib-left'], COMPASS_COLORS['lib-right']],
    start: {x: 0, y: 0.5},
    end: {x: 1, y: 0.5},
  },
}

/**
 * Maps the RAQ "ninth name" display strings to COMPASS_COLORS.
 * ("Auth Econocenter" = the center column = auth-center, etc.)
 */
export const NINTH_NAME_TO_COMPASS_COLOR: Record<string, string> = {
  'Auth Left': COMPASS_COLORS['auth-left'],
  'Auth Econocenter': COMPASS_COLORS['auth-center'],
  'Auth Right': COMPASS_COLORS['auth-right'],
  'Center Left': COMPASS_COLORS['center-left'],
  'Center Econocenter': COMPASS_COLORS['center'],
  'Center Right': COMPASS_COLORS['center-right'],
  'Lib Left': COMPASS_COLORS['lib-left'],
  'Lib Econocenter': COMPASS_COLORS['lib-center'],
  'Lib Right': COMPASS_COLORS['lib-right'],
}

/**
 * Look up the cross-section gradient for a given solid compass color.
 * Returns the gradient definition if the color belongs to a cross-section
 * position (auth-center, center-left, center-right, lib-center),
 * or if the color is already a gradient tuple.
 * Otherwise returns null.
 */
export function getCrossGradientByColor(
  color: string | string[],
):
  | {
      colors: [string, string]
      start: {x: number; y: number}
      end: {x: number; y: number}
    }
  | null {
  // If already a gradient array, use it directly with horizontal default
  if (Array.isArray(color) && color.length >= 2) {
    return {
      colors: [color[0], color[1]],
      start: {x: 0, y: 0.5},
      end: {x: 1, y: 0.5},
    }
  }

  const position = (
    Object.entries(COMPASS_COLORS) as [CompassPositionId, string][]
  ).find(([, c]) => c.toLowerCase() === (color as string).toLowerCase())?.[0]
  if (!position) return null
  const gradient = COMPASS_CROSS_GRADIENTS[position]
  return gradient ?? null
}

/**
 * Blend two hex colors 50/50 into a single solid color.
 * Used as a fallback on native where inline gradient backgrounds
 * inside <Text> are not supported.
 */
export function blendHexColors(c1: string, c2: string): string {
  const hex1 = c1.replace('#', '')
  const hex2 = c2.replace('#', '')
  const r = Math.round(
    (parseInt(hex1.substring(0, 2), 16) + parseInt(hex2.substring(0, 2), 16)) /
      2,
  )
  const g = Math.round(
    (parseInt(hex1.substring(2, 4), 16) + parseInt(hex2.substring(2, 4), 16)) /
      2,
  )
  const b = Math.round(
    (parseInt(hex1.substring(4, 6), 16) + parseInt(hex2.substring(4, 6), 16)) /
      2,
  )
  const toHex = (n: number) => n.toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}
