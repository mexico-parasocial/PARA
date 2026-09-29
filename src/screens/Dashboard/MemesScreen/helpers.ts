import {type Meme} from '#/lib/mock-data/types'
import {type MediaItem} from './types'

export const DECK_CARD_HEIGHT = 425
export const DECK_VISUAL_HEIGHT = 322
export const DECK_OVERLAP = 36
export const DECK_SECONDARY_TOP = DECK_CARD_HEIGHT - DECK_OVERLAP
export const DECK_VELOCITY_SCALE = 0.18
export const DECK_CURRENT_X_DRIFT = 24
export const DECK_STACK_X_DRIFT = 18
/** Horizontal offset between the front card and the one behind it. */
export const DECK_STACK_INSET = 52
export const DECK_MAX_WIDTH = 520
/** Start fetching the next page when this many cards remain. */
export const DECK_PREFETCH_THRESHOLD = 3

export function matchesSearch(
  values: Array<string | undefined>,
  query: string,
) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return true
  return values.some(value => value?.toLowerCase().includes(normalized))
}

export function matchesCompassFilter(
  item: Pick<Meme, 'community' | 'party' | 'state'>,
  activeFilters: string[],
) {
  if (!activeFilters.length) return true
  return activeFilters.some(filter => {
    return (
      item.community === filter ||
      item.party === filter ||
      item.state === filter
    )
  })
}

/**
 * Joins the non-empty civic context fields, so cards never render stray
 * separators for memes without party/state metadata.
 */
export function buildMetaLabel(item: MediaItem) {
  return [item.party, item.state, item.category].filter(Boolean).join(' · ')
}
