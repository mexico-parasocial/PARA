/**
 * MMKV-based storage for followed topics/items
 */
import {MMKV} from '@bsky.app/react-native-mmkv'
import {nanoid} from 'nanoid/non-secure'

import {type FollowedItem, type FollowedItemType} from './topicTypes'

// Create a dedicated MMKV instance for topics
const topicStore = new MMKV({id: 'bsky_topics'})

const FOLLOWED_ITEMS_KEY = 'followed_items'

/**
 * Get all followed items
 */
export function getFollowedItems(): FollowedItem[] {
  const stored = topicStore.getString(FOLLOWED_ITEMS_KEY)
  if (!stored) return []

  try {
    return JSON.parse(stored) as FollowedItem[]
  } catch {
    return []
  }
}

/**
 * Replace the local followed-items cache.
 */
export function setFollowedItems(items: FollowedItem[]): void {
  topicStore.set(FOLLOWED_ITEMS_KEY, JSON.stringify(items))
}

/**
 * Get followed items by type
 */
export function getFollowedItemsByType(type: FollowedItemType): FollowedItem[] {
  return getFollowedItems().filter(item => item.type === type)
}

/**
 * Check if an item is already followed
 */
export function isItemFollowed(
  type: FollowedItemType,
  identifier: string,
): boolean {
  const items = getFollowedItems()
  return items.some(
    item =>
      item.type === type &&
      item.identifier.toLowerCase() === identifier.toLowerCase(),
  )
}

/**
 * Follow a new item
 */
export function followItem(
  item: Omit<FollowedItem, 'id' | 'followedAt'>,
): FollowedItem {
  const existing = getFollowedItems()

  // Check if already following
  const alreadyFollowing = existing.some(
    i =>
      i.type === item.type &&
      i.identifier.toLowerCase() === item.identifier.toLowerCase(),
  )

  if (alreadyFollowing) {
    // Return the existing item
    return existing.find(
      i =>
        i.type === item.type &&
        i.identifier.toLowerCase() === item.identifier.toLowerCase(),
    )!
  }

  const newItem: FollowedItem = {
    ...item,
    id: nanoid(),
    followedAt: Date.now(),
  }

  const updated = [...existing, newItem]
  topicStore.set(FOLLOWED_ITEMS_KEY, JSON.stringify(updated))

  return newItem
}

/**
 * Unfollow an item by ID
 */
export function unfollowItem(id: string): void {
  const existing = getFollowedItems()
  const updated = existing.filter(item => item.id !== id)
  topicStore.set(FOLLOWED_ITEMS_KEY, JSON.stringify(updated))
}

/**
 * Unfollow by type and identifier
 */
export function unfollowByIdentifier(
  type: FollowedItemType,
  identifier: string,
): void {
  const existing = getFollowedItems()
  const updated = existing.filter(
    item =>
      !(
        item.type === type &&
        item.identifier.toLowerCase() === identifier.toLowerCase()
      ),
  )
  topicStore.set(FOLLOWED_ITEMS_KEY, JSON.stringify(updated))
}

/**
 * Toggle notifications for an item
 */
export function toggleItemNotifications(id: string): void {
  const existing = getFollowedItems()
  const updated = existing.map(item =>
    item.id === id
      ? {...item, notificationsEnabled: !item.notificationsEnabled}
      : item,
  )
  topicStore.set(FOLLOWED_ITEMS_KEY, JSON.stringify(updated))
}

/**
 * Get count of followed items by type
 */
export function getFollowedItemsCount(): Record<FollowedItemType, number> {
  const items = getFollowedItems()
  return {
    hashtag: items.filter(i => i.type === 'hashtag').length,
    policy: items.filter(i => i.type === 'policy').length,
    matter: items.filter(i => i.type === 'matter').length,
    post: items.filter(i => i.type === 'post').length,
    thread: items.filter(i => i.type === 'thread').length,
  }
}

/**
 * Clear all followed items
 */
export function clearAllFollowedItems(): void {
  topicStore.delete(FOLLOWED_ITEMS_KEY)
}
