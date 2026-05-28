import {type AppBskyFeedDefs} from '@atproto/api'

import {
  mapOpenQuestionPosts,
  toPostThreadParamsFromUri,
} from '#/screens/RAQ/open-questions-utils'

function buildPost(overrides: Partial<AppBskyFeedDefs.PostView>) {
  return {
    uri: 'at://did:plc:abc/app.bsky.feed.post/3jztest',
    cid: 'bafyreicid',
    author: {
      did: 'did:plc:abc',
      handle: 'test.handle',
      displayName: 'Tester',
      associated: {chat: {allowIncoming: 'all'}},
      labels: [],
      viewer: null,
      createdAt: '2026-03-16T00:00:00.000Z',
    },
    record: {text: 'Hello |#?OpenQuestion world'},
    replyCount: 3,
    repostCount: 0,
    likeCount: 0,
    quoteCount: 0,
    indexedAt: '2026-03-16T01:00:00.000Z',
    viewer: null,
    labels: [],
    ...overrides,
  } as AppBskyFeedDefs.PostView
}

describe('open question utils', () => {
  it('maps search posts into open-question list items', () => {
    const mapped = mapOpenQuestionPosts([buildPost({})])
    expect(mapped).toHaveLength(1)
    expect(mapped[0]).toMatchObject({
      id: 'at://did:plc:abc/app.bsky.feed.post/3jztest',
      text: 'Hello  world',
      replyCount: 3,
    })
  })

  it('parses post thread params from a valid at-uri', () => {
    const params = toPostThreadParamsFromUri(
      'at://did:plc:abc/app.bsky.feed.post/3jztest',
    )
    expect(params).toEqual({
      name: 'did:plc:abc',
      rkey: '3jztest',
    })
  })

  it('returns null for invalid uri', () => {
    expect(toPostThreadParamsFromUri('not-a-uri')).toBeNull()
  })
})
