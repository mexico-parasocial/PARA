// Mock imports since we are running in a script
// import {AppBskyFeedDefs} from '@atproto/api'

import {FeedTuner} from './src/lib/api/feed-manip'

// Mock data (from debug-timeline-dump.js)
const mockFeedItem = {
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

async function main() {
  console.log('Starting FeedTuner debug...')

  // Re-create the tuners used in feed-tuners.tsx
  const feedTuners = [
    FeedTuner.removeOrphans,
    // FeedTuner.removeReplies, // This is conditional
    FeedTuner.followedRepliesOnly({
      userDid: 'did:plc:s6iszirpjhrokcmjudgjg7pq',
    }), // alice.test DID (guessed, but strictly logic check)
    // FeedTuner.removeQuotePosts, // Conditional
    FeedTuner.dedupThreads,
    FeedTuner.removeMutedThreads,
  ]

  const tuner = new FeedTuner(feedTuners)

  console.log('Running tune...')
  const slices = tuner.tune([mockFeedItem], {dryRun: false})

  console.log('Result slices:', slices.length)
  if (slices.length === 0) {
    console.log('Feed item was filtered out!')
  } else {
    console.log('Feed item survived!')
  }
}

main()
