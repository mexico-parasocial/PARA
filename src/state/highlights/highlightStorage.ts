/**
 * MMKV-based storage for highlights
 */
import {MMKV} from '@bsky.app/react-native-mmkv'
import {nanoid} from 'nanoid/non-secure'

import {type HighlightData} from './highlightTypes'

// Create a dedicated MMKV instance for highlights
const highlightStore = new MMKV({id: 'bsky_highlights'})

const HIGHLIGHTS_KEY_PREFIX = 'highlights:'

/**
 * Get all highlights for a specific post
 */
export function getHighlightsForPost(postUri: string): HighlightData[] {
  const key = `${HIGHLIGHTS_KEY_PREFIX}${postUri}`
  const stored = highlightStore.getString(key)
  if (!stored) return []

  try {
    return JSON.parse(stored) as HighlightData[]
  } catch {
    return []
  }
}

/**
 * Save a new highlight for a post
 */
export function saveHighlight(
  postUri: string,
  highlight: Omit<HighlightData, 'id' | 'postUri' | 'createdAt'> & {
    id?: string
    createdAt?: number
  },
): HighlightData {
  const key = `${HIGHLIGHTS_KEY_PREFIX}${postUri}`
  const existing = getHighlightsForPost(postUri)

  const newHighlight: HighlightData = {
    ...highlight,
    id: highlight.id || nanoid(),
    postUri,
    createdAt: highlight.createdAt || Date.now(),
  }

  const updated = [...existing, newHighlight]
  highlightStore.set(key, JSON.stringify(updated))

  return newHighlight
}

/**
 * Delete a highlight by ID
 */
export function deleteHighlight(postUri: string, highlightId: string): void {
  const key = `${HIGHLIGHTS_KEY_PREFIX}${postUri}`
  const existing = getHighlightsForPost(postUri)
  const updated = existing.filter(h => h.id !== highlightId)
  highlightStore.set(key, JSON.stringify(updated))
}

/**
 * Update an existing highlight
 */
export function updateHighlight(
  postUri: string,
  highlightId: string,
  updates: Partial<Omit<HighlightData, 'id' | 'postUri' | 'createdAt'>>,
): void {
  const key = `${HIGHLIGHTS_KEY_PREFIX}${postUri}`
  const existing = getHighlightsForPost(postUri)
  const updated = existing.map(h =>
    h.id === highlightId ? {...h, ...updates} : h,
  )
  highlightStore.set(key, JSON.stringify(updated))
}

/**
 * Clear all highlights for a post
 */
export function clearHighlightsForPost(postUri: string): void {
  const key = `${HIGHLIGHTS_KEY_PREFIX}${postUri}`
  highlightStore.delete(key)
}

/**
 * Get all highlights across all posts
 */
export function getAllHighlights(): HighlightData[] {
  const allKeys = highlightStore.getAllKeys()
  const highlightKeys = allKeys.filter(key =>
    key.startsWith(HIGHLIGHTS_KEY_PREFIX),
  )

  const allHighlights: HighlightData[] = []
  for (const key of highlightKeys) {
    const stored = highlightStore.getString(key)
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as HighlightData[]
        allHighlights.push(...parsed)
      } catch {
        // Skip invalid entries
      }
    }
  }

  // Sort by createdAt descending (newest first)
  return allHighlights.sort((a, b) => b.createdAt - a.createdAt)
}
