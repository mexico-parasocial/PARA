import {type FeedNotification, type FeedPage} from './types'

export function getNotificationFeedItems(
  pages: readonly FeedPage[],
): FeedNotification[] {
  const items: FeedNotification[] = []
  const seen = new Set<string>()

  // Cached and paginated responses can overlap. Keep the first (newest)
  // occurrence so each rendered row has a unique, stable notification key.
  for (const page of pages) {
    for (const item of page.items) {
      if (!seen.has(item._reactKey)) {
        seen.add(item._reactKey)
        items.push(item)
      }
    }
  }

  return items
}
