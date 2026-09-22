import {app} from '@bsky/sdk/lexicons'

function main() {
  console.log('--- Testing Record Validation ---')

  const paraRecord = {
    $type: 'com.para.post',
    text: 'Hello World',
    createdAt: new Date().toISOString(),
  }

  const bskyRecord = {
    $type: 'app.bsky.feed.post',
    text: 'Hello World',
    createdAt: new Date().toISOString(),
  }

  // Replaces the old `AppBskyFeedPost.validateRecord` helper with the
  // generated lexicon schema's validation surface.
  // the generated lexicon schemas expose the same validation surface.
  const resPara = app.bsky.feed.post.$safeValidate(paraRecord)
  console.log(
    'com.para.post validation:',
    resPara.success ? '✅ Success' : '❌ Failed',
  )
  if (!resPara.success) {
    console.log('Error:', resPara.reason)
  }

  const resBsky = app.bsky.feed.post.$safeValidate(bskyRecord)
  console.log(
    'app.bsky.feed.post validation:',
    resBsky.success ? '✅ Success' : '❌ Failed',
  )
}

main()
