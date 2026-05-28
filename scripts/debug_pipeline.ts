import {type AppBskyFeedDefs, AppBskyFeedPost} from '@atproto/api'
// import * as bsky from '../src/types/bsky'

// Mock the validation function from bsky types since we can't easily import it
// But we can use the one from api
const validateRecord = AppBskyFeedPost.validateRecord

function main() {
  console.log('--- Debugging Feed Pipeline ---')

  // 1. Mock Raw Record from ListRecords
  const rawRecord = {
    uri: 'at://did:place:alice/com.para.post/12345',
    cid: 'bafyre...',
    value: {
      $type: 'com.para.post',
      text: 'Hello World',
      createdAt: new Date().toISOString(),
    },
  }

  console.log('Original Type:', rawRecord.value.$type)

  // 2. Simulate ParaFeedAPI hydration (The Fix)
  const val = rawRecord.value as any
  if (val.$type === 'com.para.post') {
    val.$type = 'app.bsky.feed.post'
    // Also apply the new fix for langs
    if (!val.langs) {
      val.langs = ['en']
    }
  }

  console.log('Patched Type:', val.$type)
  console.log('Patched Langs:', val.langs)

  // 3. Create PostView
  const postView: AppBskyFeedDefs.PostView = {
    uri: rawRecord.uri,
    cid: rawRecord.cid,
    author: {
      did: 'did:plc:alice',
      handle: 'alice.test',
      displayName: 'Alice',
      avatar: 'https://...',
      viewer: {},
      labels: [],
    },
    record: val,
    indexedAt: val.createdAt,
    likeCount: 0,
    replyCount: 0,
    repostCount: 0,
    viewer: {},
    embed: undefined,
    labels: [],
  }

  // 4. Simulate FeedViewPostsSlice validation logic
  // This is what happens in src/lib/api/feed-manip.ts

  // Check 1: isRecord
  if (!AppBskyFeedPost.isRecord(postView.record)) {
    console.error('❌ Check 1 Failed: isRecord returned false')
    // Why?
    // isRecord checks if $type === 'app.bsky.feed.post'
    console.log('Actual $type:', (postView.record as any).$type)
  } else {
    console.log('✅ Check 1 Passed: isRecord')
  }

  // Check 2: validateRecord
  const valResult = validateRecord(postView.record)
  if (!valResult.success) {
    console.error('❌ Check 2 Failed: validateRecord returned error')
    console.error(valResult.error)
  } else {
    console.log('✅ Check 2 Passed: validateRecord')
  }

  // Check 3: bsky.validate (app-specific)
  // We can't easily import the actual bsky.validate because of project structure,
  // but we usually just wrap the api validation.
  // Let's assume it passes if validateRecord passes.
}

main()
