import {describe, expect, jest, test} from '@jest/globals'

jest.mock('./feed/home', () => ({
  FALLBACK_MARKER_POST: {
    post: {
      uri: 'fallback-uri',
      record: {},
    },
  },
}))

import {FeedTuner} from './feed-manip'

// Mock data
const mockFeedItemRaw = {
  post: {
    uri: 'at://did:plc:edbptemwovho4nfqqtxf5ydt/app.bsky.feed.post/3mdw2hhtjif2r',
    cid: 'bafyreic4esgbbfqbxi4g4o7eo6uozamei7svfy4f3x6curkbsu2t36n5ca',
    author: {
      did: 'did:plc:edbptemwovho4nfqqtxf5ydt',
      handle: 'carla.test',
      displayName: 'Carla',
      associated: {
        activitySubscription: {
          allowSubscriptions: 'followers',
        },
      },
      viewer: {
        muted: false,
        blockedBy: false,
        following:
          'at://did:plc:s6iszirpjhrokcmjudgjg7pq/app.bsky.graph.follow/3mdw2hdumwq2r',
        followedBy:
          'at://did:plc:edbptemwovho4nfqqtxf5ydt/app.bsky.graph.follow/3mdw2bgzly22r',
      },
      labels: [],
    },
    record: {
      text: 'Hello World',
      $type: 'app.bsky.feed.post',
      langs: ['es'],
      createdAt: '2026-02-02T23:58:52.439Z',
    },
    bookmarkCount: 0,
    replyCount: 0,
    repostCount: 0,
    likeCount: 0,
    quoteCount: 0,
    indexedAt: '2026-02-02T23:58:52.439Z',
    viewer: {
      bookmarked: false,
      threadMuted: false,
      embeddingDisabled: false,
    },
    labels: [],
  },
}

describe('FeedTuner Debug', () => {
  test('should not filter out valid following feed posts', () => {
    // Re-create the tuners used in feed-tuners.tsx
    const feedTuners = [
      FeedTuner.removeOrphans,
      // Default Following logic (assuming no prefs)
      FeedTuner.followedRepliesOnly({
        userDid: 'did:plc:s6iszirpjhrokcmjudgjg7pq',
      }),
      FeedTuner.dedupThreads,
      FeedTuner.removeMutedThreads,
    ]

    const tuner = new FeedTuner(feedTuners)

    console.log('Running tune in TEST...')
    const slices = tuner.tune(
      [mockFeedItemRaw as unknown as AppBskyFeedDefs.FeedViewPost],
      {dryRun: false},
    )

    console.log('Test Result slices:', slices.length)
    expect(slices.length).toBeGreaterThan(0)
  })
})
