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
      'Reseeded Private Post 1',
      'Reseeded Private Post 2',
      'Reseeded Private Post 3',
    ]

    for (const text of posts) {
      await agent.api.com.atproto.repo.createRecord({
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
