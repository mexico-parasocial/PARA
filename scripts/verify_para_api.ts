import {BskyAgent} from '@atproto/api'

import {ParaFeedAPI} from '../src/lib/api/feed/para'

async function main() {
  const agent = new BskyAgent({service: 'http://localhost:2583'})

  try {
    await agent.login({
      identifier: 'alice.test',
      password: 'hunter2',
    })
    console.log('✅ Logged in as alice.test')
  } catch (e) {
    console.error('Failed to login', e)
    return
  }

  // Instantiate API for Alice herself
  const api = new ParaFeedAPI({
    agent,
    feedParams: {actor: agent.session.did},
  })

  console.log('--- Fetching Para Feed ---')
  try {
    const res = await api.fetch({limit: 10, cursor: undefined})
    console.log(`Result: ${res.feed.length} items`)

    res.feed.forEach((item, i) => {
      console.log(`Item ${i + 1}:`)
      console.log(`  URI: ${item.post.uri}`)
      const record = item.post.record as any
      console.log(`  $type: ${record.$type}`)
      console.log(`  langs: ${record.langs}`)
      console.log(`  text: ${record.text}`)

      // Also verify validation
      const {AppBskyFeedPost} = require('@atproto/api')
      const val = AppBskyFeedPost.validateRecord(record)
      console.log(`  Validation: ${val.success ? '✅ Pass' : '❌ Fail'}`)
      if (!val.success) console.error(val.error)
    })
  } catch (e) {
    console.error('API Fetch threw error:', e)
  }
}

main()
