import {BskyAgent} from '@atproto/api'

const SERVICE = 'http://localhost:2583'
const USER = 'alice.test'
const PASS = 'hunter2'

async function main() {
  const agent = new BskyAgent({service: SERVICE})

  try {
    await agent.login({identifier: USER, password: PASS})
    const did = agent.session!.did
    console.log(`✅ Logged in as ${USER} (${did})`)

    console.log('--- Checking Follows ---')
    // Check if we already follow ourselves
    let cursor: string | undefined
    let followsSelf = false

    do {
      const res = await agent.getFollows({actor: did, cursor, limit: 100})
      cursor = res.data.cursor
      const found = res.data.follows.find(f => f.did === did)
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
      await agent.follow(did)
      console.log('✅ Created follow record for self.')
    }

    // Also check Timeline again debug
    const timeline = await agent.getTimeline({limit: 5})
    console.log('--- Timeline Check (Top 5) ---')
    timeline.data.feed.forEach((item, i) => {
      const record = item.post.record as any
      console.log(`[${i}] ${record.text} (date: ${record.createdAt})`)
    })
  } catch (e) {
    console.error('Failed:', e)
  }
}

main()
