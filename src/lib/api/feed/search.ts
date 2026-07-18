import {
  type Agent,
  type AppBskyFeedDefs,
  type AppBskyFeedSearchPostsV2,
} from '@atproto/api'

import {logger} from '#/logger'
import {type FeedAPI, type FeedAPIResponse} from './types'

export class SearchPostsFeedAPI implements FeedAPI {
  agent: Agent
  params: AppBskyFeedSearchPostsV2.QueryParams
  peek: AppBskyFeedDefs.FeedViewPost | null = null

  constructor({
    agent,
    feedParams,
  }: {
    agent: Agent
    feedParams: AppBskyFeedSearchPostsV2.QueryParams
  }) {
    this.agent = agent
    this.params = feedParams
  }

  async peekLatest(): Promise<AppBskyFeedDefs.FeedViewPost> {
    if (this.peek) return this.peek
    throw new Error('Has not fetched yet')
  }

  async fetch({
    cursor,
    limit,
  }: {
    cursor: string | undefined
    limit: number
  }): Promise<FeedAPIResponse> {
    try {
      const res = await this.agent.app.bsky.feed.searchPostsV2({
        query: this.params.query || '',
        hashtags: this.params.hashtags,
        sort: this.params.sort === 'latest' ? 'recent' : this.params.sort,
        limit: Math.min(limit, 100),
        cursor,
      })

      if (res.success) {
        const feed: AppBskyFeedDefs.FeedViewPost[] = res.data.posts.map(
          post => ({
            post,
          }),
        )
        this.peek = feed[0] ?? null
        return {
          feed,
          cursor: res.data.cursor,
        }
      }
    } catch (e) {
      logger.error('SearchPostsFeedAPI fetch error', {error: e})
    }

    return {feed: []}
  }
}
