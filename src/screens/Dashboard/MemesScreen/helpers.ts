import {type Meme} from '#/lib/mock-data/types'
import {type MediaItem} from './types'

// Deck geometry. The current card sits top-left and the next card sits
// bottom-right, staggered by DECK_STAGGER and overlapping by DECK_OVERLAP.
// The shared command band fills exactly that overlap: its left end is the next
// card's top-left corner and its right end is the current card's bottom-right
// corner.
export const DECK_GUTTER = 16
export const DECK_STAGGER = 64
export const DECK_CARD_HEIGHT = 452
export const DECK_OVERLAP = 56
export const DECK_SECONDARY_TOP = DECK_CARD_HEIGHT - DECK_OVERLAP
export const DECK_THIRD_TOP = DECK_SECONDARY_TOP * 2
export const DECK_CARD_RADIUS = 12
export const DECK_INACTIVE_DIM = 0.45
export const DECK_VELOCITY_SCALE = 0.18

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

export function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${value}T12:00:00`))
}

export function buildMetaLabel(item: MediaItem) {
  return [item.party, item.state].filter(Boolean).join(' · ') || item.community
}

export function buildSubmetaLabel(item: MediaItem, _mode: string) {
  return [item.author, item.category].filter(Boolean).join(' · ')
}
