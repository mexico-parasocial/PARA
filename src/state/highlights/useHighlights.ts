/**
 * Hook for fetching and managing highlights for a specific post
 */
import {useCallback, useEffect, useReducer, useState} from 'react'
import {useQuery, useQueryClient} from '@tanstack/react-query'

import {
  deleteHighlightAnnotation,
  fetchHighlightViews,
  publishHighlightAnnotation,
  updateHighlightAnnotation,
} from '#/lib/services/highlights'
import {STALE} from '#/state/queries'
import {useAgent} from '#/state/session'
import {
  clearHighlightsForPost,
  deleteHighlight,
  getHighlightsForPost,
  saveHighlight,
  updateHighlight,
} from './highlightStorage'
import {type HighlightColor, type HighlightData} from './highlightTypes'

// Simple store for reactive updates
const listeners = new Set<() => void>()

function notifyListeners() {
  listeners.forEach(l => l())
}

export function useHighlights(postUri: string) {
  const agent = useAgent()
  const queryClient = useQueryClient()
  const [, forceUpdate] = useReducer(n => n + 1, 0)
  const [localHighlights, setLocalHighlights] = useState<HighlightData[]>(() =>
    getHighlightsForPost(postUri),
  )

  const {data: remoteHighlights = []} = useQuery<HighlightData[]>({
    queryKey: ['highlights', 'subject', postUri],
    enabled: postUri.startsWith('at://'),
    staleTime: STALE.SECONDS.THIRTY,
    placeholderData: previous => previous,
    queryFn: async () => {
      const result = await fetchHighlightViews(agent, {
        subject: postUri,
        limit: 50,
      })
      return result.highlights.map(item => ({
        id: item.uri,
        postUri,
        start: item.start,
        end: item.end,
        color: item.color as HighlightColor,
        tag: item.tag,
        isPublic: true,
        text: item.text,
        createdAt: new Date(item.createdAt).getTime(),
        syncedAt: new Date(item.indexedAt).getTime(),
        creatorDid: item.creator,
      }))
    },
  })

  const highlights = mergeHighlights(localHighlights, remoteHighlights)

  // Subscribe to updates
  useEffect(() => {
    setLocalHighlights(getHighlightsForPost(postUri))
  }, [postUri])

  useEffect(() => {
    const handleUpdate = () => {
      setLocalHighlights(getHighlightsForPost(postUri))
      forceUpdate()
    }
    listeners.add(handleUpdate)
    return () => {
      listeners.delete(handleUpdate)
    }
  }, [postUri])

  // Add a new highlight
  const addHighlight = useCallback(
    async (
      start: number,
      end: number,
      color: HighlightColor,
      isPublic: boolean = false,
      text: string,
      tag?: string,
      localId?: string,
    ) => {
      let newHighlight: HighlightData

      if (isPublic) {
        const createdAt = new Date().toISOString()
        const res = await publishHighlightAnnotation(agent, {
          subjectUri: postUri,
          text,
          start,
          end,
          color,
          tag,
          visibility: 'public',
          createdAt,
        })
        newHighlight = saveHighlight(postUri, {
          id: res.uri,
          start,
          end,
          color,
          isPublic,
          text,
          tag,
          createdAt: new Date(createdAt).getTime(),
          syncedAt: Date.now(),
          creatorDid: agent.session?.did,
        })
      } else {
        newHighlight = saveHighlight(postUri, {
          id: localId,
          start,
          end,
          color,
          isPublic,
          text,
          tag,
          creatorDid: agent.session?.did,
        })
      }

      setLocalHighlights(getHighlightsForPost(postUri))
      await queryClient.invalidateQueries({
        queryKey: ['highlights', 'subject', postUri],
      })
      notifyListeners()
      return newHighlight
    },
    [agent, postUri, queryClient],
  )

  // Remove a highlight
  const removeHighlight = useCallback(
    async (highlightId: string) => {
      const highlight = highlights.find(item => item.id === highlightId)
      if (
        highlightId.startsWith('at://') &&
        highlight?.creatorDid &&
        highlight.creatorDid === agent.session?.did
      ) {
        await deleteHighlightAnnotation(agent, highlightId)
      }
      deleteHighlight(postUri, highlightId)
      setLocalHighlights(getHighlightsForPost(postUri))
      await queryClient.invalidateQueries({
        queryKey: ['highlights', 'subject', postUri],
      })
      notifyListeners()
    },
    [agent, highlights, postUri, queryClient],
  )

  // Update highlight color or tag
  const updateHighlightData = useCallback(
    async (
      highlightId: string,
      updates: {color?: HighlightColor; tag?: string; isPublic?: boolean},
    ) => {
      const highlight = highlights.find(item => item.id === highlightId)
      if (!highlight) return

      const nextHighlight: HighlightData = {
        ...highlight,
        ...updates,
      }

      if (highlight.isPublic && nextHighlight.isPublic) {
        if (
          highlightId.startsWith('at://') &&
          highlight.creatorDid === agent.session?.did
        ) {
          await updateHighlightAnnotation(agent, highlightId, {
            subjectUri: postUri,
            text: highlight.text,
            start: highlight.start,
            end: highlight.end,
            color: nextHighlight.color,
            tag: nextHighlight.tag,
            visibility: 'public',
            createdAt: new Date(highlight.createdAt).toISOString(),
          })
        }
        updateHighlight(postUri, highlightId, {
          color: nextHighlight.color,
          tag: nextHighlight.tag,
          isPublic: true,
          syncedAt: Date.now(),
        })
      } else if (!highlight.isPublic && nextHighlight.isPublic) {
        const createdAt = new Date(highlight.createdAt).toISOString()
        const res = await publishHighlightAnnotation(agent, {
          subjectUri: postUri,
          text: highlight.text,
          start: highlight.start,
          end: highlight.end,
          color: nextHighlight.color,
          tag: nextHighlight.tag,
          visibility: 'public',
          createdAt,
        })
        deleteHighlight(postUri, highlightId)
        saveHighlight(postUri, {
          id: res.uri,
          start: highlight.start,
          end: highlight.end,
          color: nextHighlight.color,
          tag: nextHighlight.tag,
          isPublic: true,
          text: highlight.text,
          createdAt: highlight.createdAt,
          syncedAt: Date.now(),
          creatorDid: agent.session?.did,
        })
      } else if (highlight.isPublic && !nextHighlight.isPublic) {
        if (
          highlightId.startsWith('at://') &&
          highlight.creatorDid === agent.session?.did
        ) {
          await deleteHighlightAnnotation(agent, highlightId)
        }
        deleteHighlight(postUri, highlightId)
        saveHighlight(postUri, {
          start: highlight.start,
          end: highlight.end,
          color: nextHighlight.color,
          tag: nextHighlight.tag,
          isPublic: false,
          text: highlight.text,
          createdAt: highlight.createdAt,
          creatorDid: agent.session?.did,
        })
      } else {
        updateHighlight(postUri, highlightId, {
          color: nextHighlight.color,
          tag: nextHighlight.tag,
          isPublic: false,
        })
      }

      setLocalHighlights(getHighlightsForPost(postUri))
      await queryClient.invalidateQueries({
        queryKey: ['highlights', 'subject', postUri],
      })
      notifyListeners()
    },
    [agent, highlights, postUri, queryClient],
  )

  // Clear all highlights for this post
  const clearAll = useCallback(async () => {
    await Promise.all(
      highlights
        .filter(
          highlight =>
            highlight.id.startsWith('at://') &&
            highlight.creatorDid === agent.session?.did,
        )
        .map(highlight => deleteHighlightAnnotation(agent, highlight.id)),
    )
    clearHighlightsForPost(postUri)
    setLocalHighlights([])
    await queryClient.invalidateQueries({
      queryKey: ['highlights', 'subject', postUri],
    })
    notifyListeners()
  }, [agent, highlights, postUri, queryClient])

  // Convert to format expected by rn-text-touch-highlight
  const initialHighlightData = highlights.map(h => ({
    start: h.start,
    end: h.end,
  }))

  return {
    highlights,
    initialHighlightData,
    addHighlight,
    removeHighlight,
    updateHighlightData,
    clearAll,
  }
}

function mergeHighlights(
  localHighlights: HighlightData[],
  remoteHighlights: HighlightData[],
) {
  const merged = new Map<string, HighlightData>()
  for (const highlight of remoteHighlights) {
    merged.set(highlight.id, highlight)
  }
  for (const highlight of localHighlights) {
    if (!merged.has(highlight.id)) {
      merged.set(highlight.id, highlight)
    }
  }
  return Array.from(merged.values()).sort((a, b) => a.start - b.start)
}

/**
 * Get the highlight at a specific text position
 */
export function findHighlightAtPosition(
  highlights: HighlightData[],
  position: number,
): HighlightData | undefined {
  return highlights.find(h => position >= h.start && position <= h.end)
}
