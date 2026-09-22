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
      'Reseeded Private Post 1',
      'Reseeded Private Post 2',
      'Reseeded Private Post 3',
    ]

    for (const text of posts) {
      await client.call(com.atproto.repo.createRecord, {
        repo: did,
        collection: 'com.para.post',
        record: {
          $type: 'com.para.post',
          text,
          createdAt: new Date().toISOString(),
          langs: ['en'],
        },
      })
      console.log(`✅ Created post: "${text}"`)
    }
    console.log('Done reseeding.')
  } catch (e) {
    console.error('Failed to seed:', e)
  }
}

main()
