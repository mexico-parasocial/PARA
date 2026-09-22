import {deleteLike, like} from '@bsky/sdk'
import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'

import {
  PERSISTED_QUERY_GCTIME,
  PERSISTED_QUERY_ROOT,
} from '#/state/queries/index'
import {useAgent} from '#/state/session'
import {type MemeMediaItem} from '#/screens/Dashboard/MemesScreen/types'
import * as Toast from '#/components/Toast'
import {app, com} from '#/lexicons'
import * as bsky from '#/types/bsky'

const STALE_TIME = 60 * 1000 // 1 minute
const RQKEY_ROOT = 'para-memes'

export interface MemesFeedPage {
  cursor: string | undefined
  items: MemeMediaItem[]
}

function getQueryKey(): [string, string] {
  return [PERSISTED_QUERY_ROOT, RQKEY_ROOT]
}

export function useMemesFeedQuery() {
  const agent = useAgent()

  return useInfiniteQuery<
    MemesFeedPage,
    Error,
    InfiniteData<MemesFeedPage>,
    [string, string],
    string | undefined
  >({
    queryKey: getQueryKey(),
    staleTime: STALE_TIME,
    gcTime: PERSISTED_QUERY_GCTIME,
    initialPageParam: undefined,
    getNextPageParam: lastPage => lastPage.cursor,
    queryFn: async ({pageParam}) => {
      const res = await agent.appviewClient.call(com.para.feed.getMemes, {
        limit: 25,
        cursor: pageParam,
      })
      const feed = (res.feed ?? []).filter(isMemeView)
      return {
        cursor: res.cursor,
        items: feed.map(toMemeMediaItem),
      }
    },
  })
}

interface MemeView {
  post: app.bsky.feed.defs.PostView
  meta?: {
    uri?: string
    postType?: 'policy' | 'matter' | 'meme'
    official?: boolean
    party?: string
    community?: string
    category?: string
    tags?: string[]
    flairs?: string[]
    voteScore: number
    interactionMode?: 'policy_ballot' | 'reddit_votes'
    createdAt?: string
  }
}

function isMemeView(value: unknown): value is MemeView {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  if (typeof v.post !== 'object' || v.post === null) return false
  const post = v.post as Record<string, unknown>
  return typeof post.uri === 'string' && typeof post.author === 'object'
}

function toMemeMediaItem(view: MemeView): MemeMediaItem {
  const post = view.post
  const meta = view.meta
  const author = post.author
  const thumbUri = getMemeThumbnailUri(post.embed)

  // Use the post text as a title fallback.
  const record = post.record as Record<string, unknown> | undefined
  const text = typeof record?.text === 'string' ? record.text : ''

  return {
    id: post.uri,
    type: 'Meme',
    title: text.slice(0, 120) || meta?.category || 'Meme',
    category: meta?.category || '',
    votes: meta?.voteScore ?? 0,
    comments: post.replyCount ?? 0,
    color: '#3b82f6',
    author: author.handle,
    community: meta?.community || '',
    state: '',
    party: meta?.party || '',
    thumbUri,
    post,
    meta,
  }
}

function getMemeThumbnailUri(
  embed: app.bsky.feed.defs.PostView['embed'],
): string | undefined {
  if (!embed) return undefined

  if (bsky.isType(app.bsky.embed.images.view, embed)) {
    return embed.images[0]?.thumb
  }

  if (bsky.isType(app.bsky.embed.video.view, embed)) {
    return embed.thumbnail
  }

  if (bsky.isType(app.bsky.embed.recordWithMedia.view, embed)) {
    const media = embed.media
    if (bsky.isType(app.bsky.embed.images.view, media)) {
      return media.images[0]?.thumb
    }
    if (bsky.isType(app.bsky.embed.video.view, media)) {
      return media.thumbnail
    }
  }

  return undefined
}

export function useMemeVoteMutation() {
  const agent = useAgent()
  const queryClient = useQueryClient()

  return useMutation<
    void,
    Error,
    {post: app.bsky.feed.defs.PostView; vote: 1 | -1 | 0}
  >({
    mutationFn: async ({post, vote}) => {
      const likeUri = post.viewer?.like
      if (vote === 1) {
        if (!likeUri) {
          await agent.pdsClient.call(like, {
            uri: post.uri,
            cid: post.cid,
          })
        }
      } else {
        if (likeUri) {
          await agent.pdsClient.call(deleteLike, likeUri)
        }
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({queryKey: getQueryKey()})
    },
    onError: error => {
      Toast.show(`Vote failed: ${error.message}`, {type: 'error'})
    },
  })
}
