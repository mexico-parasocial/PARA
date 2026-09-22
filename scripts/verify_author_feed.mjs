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

    console.log('--- Fetching Author Feed ---')
    const feedBody = await client.call(app.bsky.feed.getAuthorFeed, {
      actor: did,
      limit: 10,
    })

    console.log(`Found ${feedBody.feed.length} items in Author Feed.`)

    feedBody.feed.forEach((item, i) => {
      const record = item.post.record
      console.log(`[${i}] ${record.text} (Type: ${record.$type})`)
    })

    if (feedBody.feed.length === 0) {
      console.log('⚠️ Feed is empty! Checking rawRepo...')
      const repoData = await client.call(com.atproto.repo.listRecords, {
        repo: did,
        collection: 'app.bsky.feed.post',
        limit: 5,
      })
      console.log(
        `Raw Repo 'app.bsky.feed.post' count: ${repoData.records.length}`,
      )
      repoData.records.forEach(r => console.log(`- ${r.value.text}`))
    }
  } catch (e) {
    console.error('Failed to fetch feed:', e)
  }
}

main()
