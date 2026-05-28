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

    const posts = [
      'Hello World! This is a public post.',
      'Checking if the feed works.',
      'Another day, another post.',
      'Public posts should appear in the main feed.',
      'Final check for public visibility.',
    ]

    for (const text of posts) {
      await agent.api.com.atproto.repo.createRecord({
        repo: did,
        collection: 'app.bsky.feed.post',
        record: {
          $type: 'app.bsky.feed.post',
          text,
          createdAt: new Date().toISOString(),
          langs: ['en'],
        },
      })
      console.log(`✅ Created public post: "${text}"`)
    }
    console.log('Done reseeding public posts.')
  } catch (e) {
    console.error('Failed to seed:', e)
  }
}

main()
