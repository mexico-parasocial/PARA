/**
 * Topic/Followed Item types
 * Supports following hashtags, policies, matters, posts, and threads
 */

/**
 * Types of items that can be followed
 */
export type FollowedItemType =
  | 'hashtag'
  | 'policy'
  | 'matter'
  | 'post'
  | 'thread'

/**
 * Represents a followed item (topic, policy, matter, etc.)
 */
export interface FollowedItem {
  id: string
  type: FollowedItemType
  /** Display name (e.g., "#climate", "Universal Healthcare") */
  displayName: string
  /** Normalized identifier for searching/matching */
  identifier: string
  /** For posts/threads, the URI */
  uri?: string
  /** Timestamp when followed */
  followedAt: number
  /** Timestamp when last updated */
  updatedAt?: number
  /** Whether notifications are enabled for this item */
  notificationsEnabled: boolean
  /** Color for display (optional) */
  color?: string
  /** Associated community/party (optional) */
  community?: string
}

/**
 * Category grouping for followed items
 */
export const FOLLOWED_ITEM_CATEGORIES: Record<
  FollowedItemType,
  {
    label: string
    icon: string
    color: string
  }
> = {
  hashtag: {
    label: 'Hashtags',
    icon: '#',
    color: '#3B82F6', // blue
  },
  policy: {
    label: 'Policies',
    icon: '📋',
    color: '#10B981', // green
  },
  matter: {
    label: 'Matters',
    icon: '💬',
    color: '#F59E0B', // amber
  },
  post: {
    label: 'Posts',
    icon: '📝',
    color: '#8B5CF6', // purple
  },
  thread: {
    label: 'Threads',
    icon: '🧵',
    color: '#EC4899', // pink
  },
}
