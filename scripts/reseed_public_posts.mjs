import {com} from '@bsky/sdk/lexicons'

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

    const posts = [
      'Hello World! This is a public post.',
      'Checking if the feed works.',
      'Another day, another post.',
      'Public posts should appear in the main feed.',
      'Final check for public visibility.',
    ]

    for (const text of posts) {
      // NOTE: `client.call` resolves to the response body directly (no
      // `{data}` wrapper like the old AtpAgent).
      await client.call(com.atproto.repo.createRecord, {
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
