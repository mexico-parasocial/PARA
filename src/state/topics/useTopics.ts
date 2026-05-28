/**
 * React hooks for followed topics/items
 */
import {useCallback, useEffect, useState} from 'react'

import {
  followItem,
  getFollowedItems,
  getFollowedItemsByType,
  isItemFollowed,
  toggleItemNotifications,
  unfollowByIdentifier,
  unfollowItem,
} from './topicStorage'
import {type FollowedItem, type FollowedItemType} from './topicTypes'

/**
 * Hook to manage followed items
 */
export function useFollowedItems(type?: FollowedItemType) {
  const [items, setItems] = useState<FollowedItem[]>([])

  // Load items on mount
  useEffect(() => {
    const loadItems = () => {
      const loaded = type ? getFollowedItemsByType(type) : getFollowedItems()
      setItems(loaded)
    }
    loadItems()
  }, [type])

  // Refresh items from storage
  const refresh = useCallback(() => {
    const loaded = type ? getFollowedItemsByType(type) : getFollowedItems()
    setItems(loaded)
  }, [type])

  // Follow a new item
  const follow = useCallback(
    (item: Omit<FollowedItem, 'id' | 'followedAt'>) => {
      const newItem = followItem(item)
      refresh()
      return newItem
    },
    [refresh],
  )

  // Unfollow by ID
  const unfollow = useCallback(
    (id: string) => {
      unfollowItem(id)
      refresh()
    },
    [refresh],
  )

  // Unfollow by type and identifier
  const unfollowByName = useCallback(
    (itemType: FollowedItemType, identifier: string) => {
      unfollowByIdentifier(itemType, identifier)
      refresh()
    },
    [refresh],
  )

  // Check if following
  const isFollowed = useCallback(
    (itemType: FollowedItemType, identifier: string) => {
      return isItemFollowed(itemType, identifier)
    },
    [],
  )

  // Toggle notifications
  const toggleNotifications = useCallback(
    (id: string) => {
      toggleItemNotifications(id)
      refresh()
    },
    [refresh],
  )

  return {
    items,
    follow,
    unfollow,
    unfollowByName,
    isFollowed,
    toggleNotifications,
    refresh,
  }
}

/**
 * Hook to quickly check/toggle follow state for a specific item
 */
export function useFollowItem(type: FollowedItemType, identifier: string) {
  const [isFollowing, setIsFollowing] = useState(false)

  useEffect(() => {
    setIsFollowing(isItemFollowed(type, identifier))
  }, [type, identifier])

  const toggleFollow = useCallback(
    (
      displayName: string,
      options?: {color?: string; community?: string; uri?: string},
    ) => {
      if (isFollowing) {
        unfollowByIdentifier(type, identifier)
        setIsFollowing(false)
      } else {
        followItem({
          type,
          identifier,
          displayName,
          notificationsEnabled: false,
          ...options,
        })
        setIsFollowing(true)
      }
    },
    [isFollowing, type, identifier],
  )

  return {isFollowing, toggleFollow}
}
