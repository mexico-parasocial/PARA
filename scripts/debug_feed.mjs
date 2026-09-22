import {app, com} from '@bsky/sdk/lexicons'

import {createParaClient} from './lib/para-client.mjs'

const SERVICE = 'http://localhost:2583'
const USER = 'alice.test'
const PASS = 'hunter2'

async function main() {
  console.log('--- Debugging Feed Visibility ---')
  const client = await createParaClient({
    service: SERVICE,
    identifier: USER,
    password: PASS,
  })

  try {
    const did = client.assertDid
    console.log(`✅ Logged in as ${USER} (${did})`)

    // 1. Check Public Posts
    console.log('\n--- Public Posts (app.bsky.feed.post) ---')
    const publicRes = await client.call(com.atproto.repo.listRecords, {
      repo: did,
      collection: 'app.bsky.feed.post',
      limit: 5,
      reverse: true,
    })
    console.log(`Found ${publicRes.records.length} recent public posts.`)
    publicRes.records.forEach(r => {
      console.log(`- [${r.value.createdAt}] ${r.value.text}`)
    })

    // 2. Check Private Posts
    console.log('\n--- Private Posts (com.para.post) ---')
    const privateRes = await client.call(com.atproto.repo.listRecords, {
      repo: did,
      collection: 'com.para.post',
      limit: 5,
      reverse: true,
    })
    console.log(`Found ${privateRes.records.length} recent private posts.`)
    privateRes.records.forEach(r => {
      console.log(
        `- [${r.value.createdAt}] ${r.value.text} ($type: ${r.value.$type})`,
      )
    })

    // 3. Check Author Feed (What the API returns)
    console.log('\n--- Author Feed (getAuthorFeed) ---')
    const feedRes = await client.call(app.bsky.feed.getAuthorFeed, {
      actor: did,
      limit: 5,
    })
    console.log(`API returned ${feedRes.feed.length} items.`)
    feedRes.feed.forEach(item => {
      const record = item.post.record
      console.log(
        `- [${record.createdAt}] ${record.text} (URI: ${item.post.uri})`,
      )
    })
    // 4. Check Timeline (getTimeline)
    console.log('\n--- Timeline (getTimeline) ---')
    try {
      const timelineRes = await client.call(app.bsky.feed.getTimeline, {
        limit: 5,
      })
      console.log(`Timeline returned ${timelineRes.feed.length} items.`)
      timelineRes.feed.forEach(item => {
        const record = item.post.record
        console.log(`- [${item.post.author.handle}] ${record.text}`)
      })
    } catch (e) {
      console.error('Error fetching timeline:', e)
    }
  } catch (e) {
    console.error('Error debugging feed:', e)
  }
}

main()
