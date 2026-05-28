import {useCallback} from 'react'
import {type AppBskyActorDefs, type AppBskyFeedDefs, AtUri} from '@atproto/api'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'

import {useToggleMutationQueue} from '#/lib/hooks/useToggleMutationQueue'
import {logger} from '#/logger'
import {updatePostShadow} from '#/state/cache/post-shadow'
import {type Shadow} from '#/state/cache/types'
import {useAgent, useSession} from '#/state/session'
import * as userActionHistory from '#/state/userActionHistory'
import {type Metrics, toClout} from '#/analytics/metrics'
import {useIsThreadMuted, useSetThreadMute} from '../cache/thread-mutes'
import {findProfileQueryData} from './profile'

const RQKEY_ROOT = 'post'
export const RQKEY = (postUri: string) => [RQKEY_ROOT, postUri]

export function usePostQuery(uri: string | undefined) {
  const agent = useAgent()
  return useQuery<AppBskyFeedDefs.PostView>({
    queryKey: RQKEY(uri || ''),
    queryFn: async () => {
      if (!uri) throw new Error('[unreachable] No URI provided')

      const urip = new AtUri(uri)

      if (!urip.host.startsWith('did:')) {
        const res = await agent.resolveHandle({
          handle: urip.host,
        })
        // @ts-expect-error TODO new-sdk-migration
        urip.host = res.data.did
      }

      const res = await agent.getPosts({uris: [urip.toString()]})
      if (res.success && res.data.posts[0]) {
        return res.data.posts[0]
      }

      throw new Error('No data')
    },
    enabled: !!uri,
  })
}

export function useGetPost() {
  const queryClient = useQueryClient()
  const agent = useAgent()
  return useCallback(
    async ({uri}: {uri: string}) => {
      return queryClient.fetchQuery({
        queryKey: RQKEY(uri || ''),
        async queryFn() {
          const urip = new AtUri(uri)

          if (!urip.host.startsWith('did:')) {
            const res = await agent.resolveHandle({
              handle: urip.host,
            })
            // @ts-expect-error TODO new-sdk-migration
            urip.host = res.data.did
          }

          const res = await agent.getPosts({
            uris: [urip.toString()],
          })

          if (res.success && res.data.posts[0]) {
            return res.data.posts[0]
          }

          throw new Error('useGetPost: post not found')
        },
      })
    },
    [queryClient, agent],
  )
}

export function useGetPosts() {
  const queryClient = useQueryClient()
  const agent = useAgent()
  return useCallback(
    async ({uris}: {uris: string[]}) => {
      return queryClient.fetchQuery({
        queryKey: RQKEY(uris.join(',') || ''),
        async queryFn() {
          const res = await agent.getPosts({
            uris,
          })

          if (res.success) {
            return res.data.posts
          } else {
            throw new Error('useGetPosts failed')
          }
        },
      })
    },
    [queryClient, agent],
  )
}

export function usePostLikeMutationQueue(
  post: Shadow<AppBskyFeedDefs.PostView>,
  viaQuote: {uri: string; cid: string} | undefined,
  feedDescriptor: string | undefined,
  logContext: Metrics['post:like']['logContext'],
) {
  const queryClient = useQueryClient()
  const postUri = post.uri
  const postCid = post.cid
  const initialLikeUri = post.viewer?.like
  const likeMutation = usePostLikeMutation(feedDescriptor, logContext, post)
  const unlikeMutation = usePostUnlikeMutation(feedDescriptor, logContext, post)

  const queueToggle = useToggleMutationQueue({
    initialState: initialLikeUri,
    runMutation: async (prevLikeUri, shouldLike) => {
      if (shouldLike) {
        const {uri: likeUri} = await likeMutation.mutateAsync({
          uri: postUri,
          cid: postCid,
          via: viaQuote,
        })
        userActionHistory.like([postUri])
        return likeUri
      } else {
        if (prevLikeUri) {
          await unlikeMutation.mutateAsync({
            postUri: postUri,
            likeUri: prevLikeUri,
          })
          userActionHistory.unlike([postUri])
        }
        return undefined
      }
    },
    onSuccess(finalLikeUri) {
      // finalize
      updatePostShadow(queryClient, postUri, {
        likeUri: finalLikeUri,
      })
    },
  })

  const queueLike = useCallback(() => {
    // optimistically update
    updatePostShadow(queryClient, postUri, {
      likeUri: 'pending',
    })
    return queueToggle(true)
  }, [queryClient, postUri, queueToggle])

  const queueUnlike = useCallback(() => {
    // optimistically update
    updatePostShadow(queryClient, postUri, {
      likeUri: undefined,
    })
    return queueToggle(false)
  }, [queryClient, postUri, queueToggle])

  return [queueLike, queueUnlike] as const
}

function usePostLikeMutation(
  feedDescriptor: string | undefined,
  logContext: Metrics['post:like']['logContext'],
  post: Shadow<AppBskyFeedDefs.PostView>,
) {
  const {currentAccount} = useSession()
  const queryClient = useQueryClient()
  const postAuthor = post.author
  const agent = useAgent()
  return useMutation<
    {uri: string}, // responds with the uri of the like
    Error,
    {uri: string; cid: string; via?: {uri: string; cid: string}} // the post's uri and cid, and the quote uri/cid if present
  >({
    mutationFn: ({uri, cid, via}) => {
      let ownProfile: AppBskyActorDefs.ProfileViewDetailed | undefined
      if (currentAccount) {
        ownProfile = findProfileQueryData(queryClient, currentAccount.did)
      }
      logger.metric('post:like', {
        uri,
        authorDid: postAuthor.did,
        logContext,
        doesPosterFollowLiker: postAuthor.viewer
          ? Boolean(postAuthor.viewer.followedBy)
          : undefined,
        doesLikerFollowPoster: postAuthor.viewer
          ? Boolean(postAuthor.viewer.following)
          : undefined,
        likerClout: toClout(ownProfile?.followersCount),
        postClout:
          post.likeCount != null &&
          post.repostCount != null &&
          post.replyCount != null
            ? toClout(post.likeCount + post.repostCount + post.replyCount)
            : undefined,
        feedDescriptor: feedDescriptor,
      })
      return agent.like(uri, cid, via)
    },
  })
}

function usePostUnlikeMutation(
  feedDescriptor: string | undefined,
  logContext: Metrics['post:unlike']['logContext'],
  post: Shadow<AppBskyFeedDefs.PostView>,
) {
  const agent = useAgent()
  return useMutation<void, Error, {postUri: string; likeUri: string}>({
    mutationFn: ({postUri, likeUri}) => {
      logger.metric('post:unlike', {
        uri: postUri,
        authorDid: post.author.did,
        logContext,
        feedDescriptor,
      })
      return agent.deleteLike(likeUri)
    },
  })
}

export function usePostQuoteMutationQueue(
  post: Shadow<AppBskyFeedDefs.PostView>,
  viaQuote: {uri: string; cid: string} | undefined,
  feedDescriptor: string | undefined,
  logContext: Metrics['post:quote']['logContext'],
) {
  const queryClient = useQueryClient()
  const postUri = post.uri
  const postCid = post.cid
  const initialQuoteUri = post.viewer?.repost
  const quoteMutation = usePostQuoteMutation(feedDescriptor, logContext, post)
  const unquoteMutation = usePostUnquoteMutation(
    feedDescriptor,
    logContext,
    post,
  )

  const queueToggle = useToggleMutationQueue({
    initialState: initialQuoteUri,
    runMutation: async (prevQuoteUri, shouldQuote) => {
      if (shouldQuote) {
        const {uri: quoteUri} = await quoteMutation.mutateAsync({
          uri: postUri,
          cid: postCid,
          via: viaQuote,
        })
        return quoteUri
      } else {
        if (prevQuoteUri) {
          await unquoteMutation.mutateAsync({
            postUri: postUri,
            quoteUri: prevQuoteUri,
          })
        }
        return undefined
      }
    },
    onSuccess(finalQuoteUri) {
      // finalize
      updatePostShadow(queryClient, postUri, {
        repostUri: finalQuoteUri,
      })
    },
  })

  const queueQuote = useCallback(() => {
    // optimistically update
    updatePostShadow(queryClient, postUri, {
      repostUri: 'pending',
    })
    return queueToggle(true)
  }, [queryClient, postUri, queueToggle])

  const queueUnquote = useCallback(() => {
    // optimistically update
    updatePostShadow(queryClient, postUri, {
      repostUri: undefined,
    })
    return queueToggle(false)
  }, [queryClient, postUri, queueToggle])

  return [queueQuote, queueUnquote] as const
}

function usePostQuoteMutation(
  feedDescriptor: string | undefined,
  logContext: Metrics['post:quote']['logContext'],
  post: Shadow<AppBskyFeedDefs.PostView>,
) {
  const agent = useAgent()
  return useMutation<
    {uri: string}, // responds with the uri of the quote
    Error,
    {uri: string; cid: string; via?: {uri: string; cid: string}} // the post's uri and cid, and the quote uri/cid if present
  >({
    mutationFn: ({uri, cid, via}) => {
      logger.metric('post:quote', {
        uri,
        authorDid: post.author.did,
        logContext,
        feedDescriptor,
      })
      return agent.repost(uri, cid, via)
    },
  })
}

function usePostUnquoteMutation(
  feedDescriptor: string | undefined,
  logContext: Metrics['post:unquote']['logContext'],
  post: Shadow<AppBskyFeedDefs.PostView>,
) {
  const agent = useAgent()
  return useMutation<void, Error, {postUri: string; quoteUri: string}>({
    mutationFn: ({postUri, quoteUri}) => {
      logger.metric('post:unquote', {
        uri: postUri,
        authorDid: post.author.did,
        logContext,
        feedDescriptor,
      })
      return agent.deleteRepost(quoteUri)
    },
  })
}

export function usePostDeleteMutation() {
  const queryClient = useQueryClient()
  const agent = useAgent()
  return useMutation<void, Error, {uri: string}>({
    mutationFn: async ({uri}) => {
      await agent.deletePost(uri)
    },
    onSuccess(_, variables) {
      updatePostShadow(queryClient, variables.uri, {isDeleted: true})
    },
  })
}

export function useThreadMuteMutationQueue(
  post: Shadow<AppBskyFeedDefs.PostView>,
  rootUri: string,
) {
  const threadMuteMutation = useThreadMuteMutation()
  const threadUnmuteMutation = useThreadUnmuteMutation()
  const isThreadMuted = useIsThreadMuted(rootUri, post.viewer?.threadMuted)
  const setThreadMute = useSetThreadMute()

  const queueToggle = useToggleMutationQueue<boolean>({
    initialState: isThreadMuted,
    runMutation: async (_prev, shouldMute) => {
      if (shouldMute) {
        await threadMuteMutation.mutateAsync({
          uri: rootUri,
        })
        return true
      } else {
        await threadUnmuteMutation.mutateAsync({
          uri: rootUri,
        })
        return false
      }
    },
    onSuccess(finalIsMuted) {
      // finalize
      setThreadMute(rootUri, finalIsMuted)
    },
  })

  const queueMuteThread = useCallback(() => {
    // optimistically update
    setThreadMute(rootUri, true)
    return queueToggle(true)
  }, [setThreadMute, rootUri, queueToggle])

  const queueUnmuteThread = useCallback(() => {
    // optimistically update
    setThreadMute(rootUri, false)
    return queueToggle(false)
  }, [rootUri, setThreadMute, queueToggle])

  return [isThreadMuted, queueMuteThread, queueUnmuteThread] as const
}

function useThreadMuteMutation() {
  const agent = useAgent()
  return useMutation<
    {},
    Error,
    {uri: string} // the root post's uri
  >({
    mutationFn: ({uri}) => {
      return agent.api.app.bsky.graph.muteThread({root: uri})
    },
  })
}

function useThreadUnmuteMutation() {
  const agent = useAgent()
  return useMutation<{}, Error, {uri: string}>({
    mutationFn: ({uri}) => {
      return agent.api.app.bsky.graph.unmuteThread({root: uri})
    },
  })
}
