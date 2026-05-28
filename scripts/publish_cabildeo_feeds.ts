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

    const feeds = [
      {
        rkey: 'cabildeo-global',
        name: 'Cabildeos Globales',
        desc: 'Debates activos a nivel global y propuestas para mejorar la humanidad.',
      },
      {
        rkey: 'cabildeo-jalisco',
        name: 'Asuntos de Jalisco',
        desc: 'Participación ciudadana en el estado de Jalisco.',
      },
      {
        rkey: 'cabildeo-resueltos',
        name: 'Acuerdos Resueltos',
        desc: 'Archivo de consensos alcanzados y cerrados.',
      },
    ]

    for (const feed of feeds) {
      const uri = `at://${did}/app.bsky.feed.generator/${feed.rkey}`
      await agent.api.com.atproto.repo.putRecord({
        repo: did,
        collection: 'app.bsky.feed.generator',
        rkey: feed.rkey,
        record: {
          did: did, // Service DID usually, using user DID for local dev
          displayName: feed.name,
          description: feed.desc,
          createdAt: new Date().toISOString(),
        },
      })
      console.log(`✅ Created feed: ${feed.name} (${uri})`)
    }
    console.log('Done publishing cabildeo feeds.')
  } catch (e) {
    console.error('Failed to publish feeds:', e)
  }
}

main()
