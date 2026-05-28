import {
  type InfiniteData,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'

import {toggleSaveHighlight, voteOnHighlight} from '#/lib/services/highlights'
import {type FeedPage, RQKEY_ROOT} from '#/state/queries/post-feed'

export function useHighlightVoteMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      direction,
    }: {
      id: string
      direction: 'up' | 'down'
    }) => {
      // For AT Protocol posts (real feed data), the optimistic cache update
      // handles the UI. The mutationFn is a no-op since we don't have a real
      // voting endpoint yet — the cache update IS the source of truth for now.
      if (id.startsWith('at://')) {
        return
      }
      // For mock highlight IDs, use the mock service
      return voteOnHighlight(id, direction)
    },
    onMutate: async ({id, direction}) => {
      // Cancel outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({queryKey: [RQKEY_ROOT]})

      // Snapshot previous value for rollback
      const previousData = queryClient.getQueriesData({queryKey: [RQKEY_ROOT]})

      // Optimistically update all post-feed queries
      queryClient.setQueriesData<InfiniteData<FeedPage>>(
        {queryKey: [RQKEY_ROOT]},
        old => {
          if (!old) return old

          return {
            ...old,
            pages: old.pages.map(page => ({
              ...page,
              slices: page.slices.map(slice => ({
                ...slice,
                items: slice.items.map(item => {
                  if (item.post.uri !== id) {
                    return item
                  }

                  // Found the post to update
                  const currentLikes = item.post.likeCount || 0
                  const hasLiked = !!item.post.viewer?.like

                  let newLikes = currentLikes
                  let newHasLiked = hasLiked

                  if (direction === 'up') {
                    if (hasLiked) {
                      // Remove upvote
                      newLikes = Math.max(0, currentLikes - 1)
                      newHasLiked = false
                    } else {
                      // Add upvote
                      newLikes = currentLikes + 1
                      newHasLiked = true
                    }
                  } else if (direction === 'down') {
                    // Downvote: if upvoted, remove the upvote
                    if (hasLiked) {
                      newLikes = Math.max(0, currentLikes - 1)
                      newHasLiked = false
                    }
                    // Note: Mock doesn't support actual downvote counters yet
                  }

                  // Create new objects for immutability
                  return {
                    ...item,
                    post: {
                      ...item.post,
                      likeCount: newLikes,
                      viewer: {
                        ...(item.post.viewer || {}),
                        like: newHasLiked ? 'at://fake/like/uri' : undefined,
                      },
                    },
                  }
                }),
              })),
            })),
          }
        },
      )

      return {previousData}
    },
    onError: (_error, _variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
    },
    // NOTE: No onSettled invalidation — this was overwriting optimistic updates
    // because the server data hasn't actually changed. The cache update from
    // onMutate is the source of truth until a real voting API is implemented.
  })
}

export function useHighlightSaveMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: toggleSaveHighlight,
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['highlights']})
    },
  })
}
