import {app} from '@bsky/sdk/lexicons'

import {createParaClient} from './lib/para-client.mjs'

const SERVICE = 'http://localhost:2583'
const USER = 'alice.test'
const PASS = 'hunter2'

async function main() {
  const client = await createParaClient({
    service: SERVICE,
    identifier: USER,
    password: PASS,
  })

  try {
    const did = client.assertDid
    console.log(`✅ Logged in as ${USER} (${did})`)

    console.log('--- Checking Follows ---')
    // Check if we already follow ourselves
    let cursor
    let followsSelf = false

    do {
      const res = await client.call(app.bsky.graph.getFollows, {
        actor: did,
        cursor,
        limit: 100,
      })
      cursor = res.cursor
      const found = res.follows.find(f => f.did === did)
      if (found) {
        followsSelf = true
        console.log('✅ User already follows self.')
        break
      }
    } while (cursor)

    if (followsSelf) {
      console.log('Skipping follow creation.')
    } else {
      console.log('⚠️ User does NOT follow self. Creating follow...')
      await client.create(app.bsky.graph.follow, {
        subject: did,
        createdAt: new Date().toISOString(),
      })
      console.log('✅ Created follow record for self.')
    }

    // Also check Timeline again debug
    const timeline = await client.call(app.bsky.feed.getTimeline, {limit: 5})
    console.log('--- Timeline Check (Top 5) ---')
    timeline.feed.forEach((item, i) => {
      const record = item.post.record
      console.log(`[${i}] ${record.text} (date: ${record.createdAt})`)
    })
  } catch (e) {
    console.error('Failed:', e)
  }
}

main()
