import {AppBskyFeedPost} from '@atproto/api'

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

  const resPara = AppBskyFeedPost.validateRecord(paraRecord)
  console.log(
    'com.para.post validation:',
    resPara.success ? '✅ Success' : '❌ Failed',
  )
  if (!resPara.success) {
    console.log('Error:', resPara.error)
  }

  const resBsky = AppBskyFeedPost.validateRecord(bskyRecord)
  console.log(
    'app.bsky.feed.post validation:',
    resBsky.success ? '✅ Success' : '❌ Failed',
  )
}

main()
