/**
 * Highlight data types for the text highlighting feature
 */

import {COMPASS_COLORS} from '#/lib/compass/compassColors'

/**
 * The 9 highlight colors — one per compass position.
 * Colors are sourced from the canonical COMPASS_COLORS palette
 * (src/lib/compass/compassColors.ts) so they always match the
 * CompassScreen, CompassMini, and RAQ visualizations.
 *
 * Solid colors only — no gradients stored in highlight data.
 */
export const HIGHLIGHT_COLORS = {
  authLeft: COMPASS_COLORS['auth-left'],
  authCenter: COMPASS_COLORS['auth-center'],
  authRight: COMPASS_COLORS['auth-right'],
  centerLeft: COMPASS_COLORS['center-left'],
  centerCenter: COMPASS_COLORS['center'],
  centerRight: COMPASS_COLORS['center-right'],
  libLeft: COMPASS_COLORS['lib-left'],
  libCenter: COMPASS_COLORS['lib-center'],
  libRight: COMPASS_COLORS['lib-right'],
} as const

export type HighlightColorKey = keyof typeof HIGHLIGHT_COLORS
export type HighlightColor = (typeof HIGHLIGHT_COLORS)[HighlightColorKey]

/**
 * Represents a saved highlight on a post
 */
export interface HighlightData {
  id: string
  postUri: string
  start: number
  end: number
  color: HighlightColor
  tag?: string
  isPublic: boolean
  text: string
  createdAt: number
  syncedAt?: number
  creatorDid?: string
}

/**
 * Pending highlight during selection (before color/tag assignment)
 */
export interface PendingHighlight {
  start: number
  end: number
}

/**
 * Highlight mode state
 */
export interface HighlightModeState {
  isActive: boolean
  postUri: string | null
  pendingHighlight: PendingHighlight | null
}
