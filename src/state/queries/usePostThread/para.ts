import {type AppBskyActorDefs, AtUri} from '@atproto/api'

import {
  hydrateParaPostView,
  isParaPostView,
  type ParaPostView,
} from '#/lib/api/feed/para'
import {type UsePostThreadQueryResult} from '#/state/queries/usePostThread/types'

export function isParaPostUri(uri: string) {
  try {
    return new AtUri(uri).collection === 'com.para.post'
  } catch {
    return false
  }
}

export function getParaThreadAuthors(data: unknown) {
  const thread = readParaThreadResponse(data)
  if (!thread?.post) return []
  return [
    ...new Set(
      [thread.post, ...thread.parents, ...thread.replies].map(
        post => post.author,
      ),
    ),
  ]
}

export function adaptParaPostThread(
  data: unknown,
  profiles = new Map<string, AppBskyActorDefs.ProfileViewDetailed>(),
): UsePostThreadQueryResult {
  const thread = readParaThreadResponse(data)
  if (!thread?.post) {
    return {thread: [], threadgate: undefined, hasOtherReplies: false}
  }

  const depthByUri = new Map<string, number>()
  const parentItems = thread.parents.map((post, index) => {
    const depth = index - thread.parents.length
    depthByUri.set(post.uri, depth)
    return toThreadItem(post, depth, profiles)
  })

  depthByUri.set(thread.post.uri, 0)
  const anchorItem = toThreadItem(thread.post, 0, profiles)
  const replyItems = thread.replies.map(post => {
    const parentDepth = post.replyParent
      ? (depthByUri.get(post.replyParent) ?? 0)
      : 0
    const depth = Math.max(parentDepth + 1, 1)
    depthByUri.set(post.uri, depth)
    return toThreadItem(post, depth, profiles)
  })

  return {
    thread: [...parentItems, anchorItem, ...replyItems],
    threadgate: undefined,
    hasOtherReplies: false,
  }
}

function readParaThreadResponse(value: unknown):
  | {
      post: ParaPostView
      parents: ParaPostView[]
      replies: ParaPostView[]
    }
  | undefined {
  if (!value || typeof value !== 'object') return
  const data = value as {
    post?: unknown
    parents?: unknown[]
    replies?: unknown[]
  }
  if (!isParaPostView(data.post)) return
  return {
    post: data.post,
    parents: (data.parents ?? []).filter(isParaPostView),
    replies: (data.replies ?? []).filter(isParaPostView),
  }
}

function toThreadItem(
  paraPost: ParaPostView,
  depth: number,
  profiles: Map<string, AppBskyActorDefs.ProfileViewDetailed>,
): UsePostThreadQueryResult['thread'][number] {
  const hydrated = hydrateParaPostView(
    paraPost,
    profiles.get(paraPost.author) ?? {
      did: paraPost.author,
      handle: paraPost.author,
      displayName: paraPost.author,
      labels: [],
    },
  ).post

  return {
    uri: paraPost.uri,
    depth,
    value: {
      $type: 'app.bsky.unspecced.defs#threadItemPost',
      post: hydrated,
      moreParents: false,
      moreReplies: 0,
      opThread: false,
      hiddenByThreadgate: false,
      mutedByViewer: false,
    },
  } as UsePostThreadQueryResult['thread'][number]
}
