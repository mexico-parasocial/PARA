import {app} from '@bsky/sdk/lexicons'

// Replaces the old `AppBskyFeedPost.validateRecord` / `isRecord` helpers with
// the generated lexicon schema's validation surface.
const safeValidatePost = app.bsky.feed.post.$safeValidate

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
  const val = rawRecord.value
  if (val.$type === 'com.para.post') {
    val.$type = 'app.bsky.feed.post'
    // Also apply the new fix for langs
    if (!val.langs) {
      val.langs = ['en']
    }
  }

  console.log('Patched Type:', val.$type)
  console.log('Patched Langs:', val.langs)

  // 3. Create PostView (same shape as app.bsky.feed.defs#postView)
  const postView = {
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

  // Check 1: $type marker (equivalent of the old AppBskyFeedPost.isRecord)
  if (postView.record.$type !== 'app.bsky.feed.post') {
    console.error('❌ Check 1 Failed: $type is not app.bsky.feed.post')
    // Why?
    // isRecord checked if $type === 'app.bsky.feed.post'
    console.log('Actual $type:', postView.record.$type)
  } else {
    console.log('✅ Check 1 Passed: $type marker')
  }

  // Check 2: safeValidate (equivalent of the old validateRecord)
  const valResult = safeValidatePost(postView.record)
  if (!valResult.success) {
    console.error('❌ Check 2 Failed: safeValidate returned error')
    console.error(valResult.reason)
  } else {
    console.log('✅ Check 2 Passed: safeValidate')
  }

  // Check 3: bsky.validate (app-specific)
  // We can't easily import the actual bsky.validate because of project structure,
  // but we usually just wrap the lexicon validation.
  // Let's assume it passes if safeValidate passes.
}

main()
