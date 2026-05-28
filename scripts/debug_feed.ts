import {BskyAgent} from '@atproto/api'

const SERVICE = 'http://localhost:2583'
const USER = 'alice.test'
const PASS = 'hunter2'

async function main() {
  console.log('--- Debugging Feed Visibility ---')
  const agent = new BskyAgent({service: SERVICE})

  try {
    await agent.login({identifier: USER, password: PASS})
    const did = agent.session!.did
    console.log(`✅ Logged in as ${USER} (${did})`)

    // 1. Check Public Posts
    console.log('\n--- Public Posts (app.bsky.feed.post) ---')
    const publicRes = await agent.api.com.atproto.repo.listRecords({
      repo: did,
      collection: 'app.bsky.feed.post',
      limit: 5,
      reverse: true,
    })
    console.log(`Found ${publicRes.data.records.length} recent public posts.`)
    publicRes.data.records.forEach((r: any) => {
      console.log(`- [${r.value.createdAt}] ${r.value.text}`)
    })

    // 2. Check Private Posts
    console.log('\n--- Private Posts (com.para.post) ---')
    const privateRes = await agent.api.com.atproto.repo.listRecords({
      repo: did,
      collection: 'com.para.post',
      limit: 5,
      reverse: true,
    })
    console.log(`Found ${privateRes.data.records.length} recent private posts.`)
    privateRes.data.records.forEach((r: any) => {
      console.log(
        `- [${r.value.createdAt}] ${r.value.text} ($type: ${r.value.$type})`,
      )
    })

    // 3. Check Author Feed (What the API returns)
    console.log('\n--- Author Feed (getAuthorFeed) ---')
    const feedRes = await agent.getAuthorFeed({actor: did, limit: 5})
    console.log(`API returned ${feedRes.data.feed.length} items.`)
    feedRes.data.feed.forEach(item => {
      const record = item.post.record as any
      console.log(
        `- [${record.createdAt}] ${record.text} (URI: ${item.post.uri})`,
      )
    })
    // 4. Check Timeline (getTimeline)
    console.log('\n--- Timeline (getTimeline) ---')
    try {
      const timelineRes = await agent.getTimeline({limit: 5})
      console.log(`Timeline returned ${timelineRes.data.feed.length} items.`)
      timelineRes.data.feed.forEach(item => {
        const record = item.post.record as any
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
