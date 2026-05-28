import {type Meme} from '#/lib/mock-data/types'
import {type MediaItem} from './types'

export const DECK_CARD_HEIGHT = 336
export const DECK_VISUAL_HEIGHT = 258
export const DECK_OVERLAP = 110
export const DECK_SECONDARY_TOP = DECK_CARD_HEIGHT - DECK_OVERLAP
export const DECK_THIRD_TOP =
  DECK_SECONDARY_TOP + DECK_CARD_HEIGHT - DECK_OVERLAP
export const DECK_VELOCITY_SCALE = 0.18
export const DECK_CURRENT_X_DRIFT = 24
export const DECK_STACK_X_DRIFT = 18

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

export function buildSubmetaLabel(item: MediaItem, _mode: string) {
  const meme = item
  return `${meme.author} · ${meme.category}`
}
