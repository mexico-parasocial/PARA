import {app, com} from '@bsky/sdk/lexicons'

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
      await client.call(com.atproto.repo.putRecord, {
        repo: did,
        collection: 'app.bsky.feed.generator',
        rkey: feed.rkey,
        record: {
          $type: 'app.bsky.feed.generator',
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
