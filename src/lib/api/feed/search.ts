import {type AppBskyFeedDefs, type AppBskyFeedSearchPostsV2} from '@atproto/api'
import {type Client} from '@atproto/lex'

import {logger} from '#/logger'
import {app} from '#/lexicons'
import {type FeedAPI, type FeedAPIResponse} from './types'

export class SearchPostsFeedAPI implements FeedAPI {
  client: Client
  params: AppBskyFeedSearchPostsV2.QueryParams
  peek: AppBskyFeedDefs.FeedViewPost | null = null

  constructor({
    client,
    feedParams,
  }: {
    client: Client
    feedParams: AppBskyFeedSearchPostsV2.QueryParams
  }) {
    this.client = client
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
      const res = await this.client.call(app.bsky.feed.searchPostsV2, {
        query: this.params.query || '',
        hashtags: this.params.hashtags,
        sort: this.params.sort === 'latest' ? 'recent' : this.params.sort,
        limit: Math.min(limit, 100),
        cursor,
      })

      const feed: AppBskyFeedDefs.FeedViewPost[] = res.posts.map(post => ({
        post: post as unknown as AppBskyFeedDefs.PostView,
      }))
      this.peek = feed[0] ?? null
      return {
        feed,
        cursor: res.cursor,
      }
    } catch (e) {
      logger.error('SearchPostsFeedAPI fetch error', {error: e})
    }

    return {feed: []}
  }
}
