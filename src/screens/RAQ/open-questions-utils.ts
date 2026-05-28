import {type AppBskyFeedDefs, AtUri} from '@atproto/api'

import {type OpenQuestion} from '#/lib/mock-data/types'

export type OpenQuestionListItem = {
  id: string
  text: string
  author: {
    handle: string
    avatar: string
  }
  replyCount: number
  timestamp: string
  isStarterPrompt?: boolean
}

export function mapOpenQuestionPosts(
  posts: AppBskyFeedDefs.PostView[],
): OpenQuestionListItem[] {
  return posts.map(post => ({
    id: post.uri,
    text:
      (post.record as {text?: string})?.text?.replace(
        /\|#\?OpenQuestion/g,
        '',
      ) || '',
    author: {
      handle: post.author.handle,
      avatar: post.author.avatar || '',
    },
    replyCount: post.replyCount || 0,
    timestamp: post.indexedAt,
  }))
}

export function mapStarterOpenQuestions(
  questions: OpenQuestion[],
): OpenQuestionListItem[] {
  return questions.map(question => ({
    ...question,
    timestamp: new Date().toISOString(),
    isStarterPrompt: true,
  }))
}

export function toPostThreadParamsFromUri(uri: string) {
  try {
    const parsed = new AtUri(uri)
    return {
      name: parsed.host,
      rkey: parsed.rkey,
      ...(parsed.collection !== 'app.bsky.feed.post'
        ? {collection: parsed.collection}
        : {}),
    }
  } catch {
    return null
  }
}
